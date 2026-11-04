import ipaddress

from collections import defaultdict
from datetime import datetime, timedelta, timezone

from tools.wazuh.alert_tools import wazuh_alert_tools

# ==========================================================
# 1. CONFIGURATION
# ==========================================================

FAILED_EVENT_IDS = {
    "4625",  # Windows Logon Failure
    "4771",  # Kerberos Pre-authentication Failed
    "4776",  # NTLM Authentication Failed
}


# ==========================================================
# 2. HELPER FUNCTIONS
# ==========================================================

def get_nested(data, *keys):

    current = data

    for key in keys:

        if not isinstance(current, dict):
            return None

        current = current.get(key)

    return current


def get_event_id(source):

    paths = [
        ("data", "win", "system", "eventID"),
        ("event", "system", "eventID"),
        ("data", "eventID"),
    ]

    for path in paths:

        value = get_nested(source, *path)

        if value is not None:
            return str(value)

    return None


def get_event_data(source):

    paths = [
        ("data", "win", "eventdata"),
        ("event", "eventdata"),
    ]

    for path in paths:

        value = get_nested(source, *path)

        if isinstance(value, dict):
            return value

    return {}


def get_source_ip(source):

    event_data = get_event_data(source)

    possible_ips = [
        event_data.get("ipAddress"),
        event_data.get("ip_address"),
        event_data.get("ipAddressV6"),
        get_nested(source, "data", "srcip"),
        get_nested(source, "data", "src_ip"),
    ]

    for value in possible_ips:

        if not isinstance(value, str):
            continue

        value = value.strip()

        if not value or value == "-":
            continue

        try:
            address = ipaddress.ip_address(value)

            # Chỉ IPv6 mới có thuộc tính ipv4_mapped.
            if isinstance(address, ipaddress.IPv6Address):
                if address.ipv4_mapped:
                    address = address.ipv4_mapped

            # Bỏ qua địa chỉ không phù hợp để xác định nguồn tấn công.
            if (
                address.is_loopback
                or address.is_link_local
                or address.is_multicast
                or address.is_unspecified
            ):
                continue

            return str(address)

        except ValueError:
            continue

    return None
def get_timestamp(source):

    value = (
        source.get("timestamp")
        or source.get("@timestamp")
    )

    if not isinstance(value, str):
        return None

    try:

        timestamp = datetime.fromisoformat(
            value.replace("Z", "+00:00")
        )

        if timestamp.tzinfo is None:

            timestamp = timestamp.replace(
                tzinfo=timezone.utc
            )

        return timestamp.astimezone(timezone.utc)

    except ValueError:
        return None


def is_protected_ip(ip, protected_ips):

    address = ipaddress.ip_address(ip)

    for item in protected_ips:

        network = ipaddress.ip_network(
            item,
            strict=False
        )

        if address in network:
            return True

    return False


# ==========================================================
# 3. BRUTE FORCE DETECTOR
# ==========================================================

class BruteForceDetector:

    def __init__(self):

        self.client = wazuh_alert_tools

    def detect(

        self,

        window_minutes=5,

        threshold=5,

        limit=1000,

        protected_ips=None

    ):

        """
        Phát hiện các IP có nhiều lần đăng nhập thất bại.

        window_minutes:
            Khoảng thời gian phân tích.

        threshold:
            Số lần thất bại tối thiểu.

        limit:
            Số alert tối đa truy vấn.

        protected_ips:
            Danh sách IP/CIDR không được đưa vào danh sách
            đề xuất xử lý.
        """

        window_minutes = int(window_minutes)
        threshold = int(threshold)
        limit = int(limit)

        if not 1 <= window_minutes <= 1440:
            raise ValueError(
                "window_minutes phải từ 1 đến 1440."
            )

        if not 2 <= threshold <= 10000:
            raise ValueError(
                "threshold phải từ 2 đến 10000."
            )

        if not 1 <= limit <= 5000:
            raise ValueError(
                "limit phải từ 1 đến 5000."
            )

        protected_ips = protected_ips or []

        now = datetime.now(timezone.utc)

        cutoff = now - timedelta(
            minutes=window_minutes
        )

        # ==================================================
        # 3.1 QUERY OPENSEARCH
        # ==================================================

        event_fields = [
            "data.win.system.eventID",
            "event.system.eventID",
            "data.eventID",
        ]

        query = {

            "size": limit,

            "sort": [
                {
                    "timestamp": {
                        "order": "desc"
                    }
                }
            ],

            "_source": [
                "timestamp",
                "@timestamp",
                "data",
                "event",
                "agent",
                "rule",
                "full_log"
            ],

            "query": {

                "bool": {

                    "filter": [

                        {
                            "range": {
                                "timestamp": {
                                    "gte": f"now-{window_minutes}m",
                                    "lte": "now"
                                }
                            }
                        }

                    ],

                    "should": [

                        {
                            "terms": {
                                field: list(FAILED_EVENT_IDS)
                            }
                        }

                        for field in event_fields

                    ],

                    "minimum_should_match": 1

                }

            }

        }

        result = self.client._search(query)

        hits = (
            result.get("hits", {})
            .get("hits", [])
        )

        # ==================================================
        # 3.2 GROUP EVENTS BY IP
        # ==================================================

        grouped_events = defaultdict(list)

        skipped = {
            "invalid_event": 0,
            "no_ip": 0,
            "protected_ip": 0,
            "invalid_timestamp": 0,
        }

        for hit in hits:

            source = hit.get("_source", {})

            event_id = get_event_id(source)

            if event_id not in FAILED_EVENT_IDS:

                skipped["invalid_event"] += 1
                continue

            ip = get_source_ip(source)

            if not ip:

                skipped["no_ip"] += 1
                continue

            if is_protected_ip(ip, protected_ips):

                skipped["protected_ip"] += 1
                continue

            timestamp = get_timestamp(source)

            if not timestamp:

                skipped["invalid_timestamp"] += 1
                continue

            if timestamp < cutoff or timestamp > now:

                continue

            event_data = get_event_data(source)

            username = (

                event_data.get("targetUserName")

                or event_data.get("subjectUserName")

                or event_data.get("accountName")

            )

            grouped_events[ip].append({

                "alert_id": hit.get("_id"),

                "event_id": event_id,

                "timestamp": timestamp.isoformat(),

                "username": username,

                "agent": get_nested(
                    source,
                    "agent",
                    "name"
                ),

                "rule_id": get_nested(
                    source,
                    "rule",
                    "id"
                ),

            })

        # ==================================================
        # 3.3 ANALYZE IP
        # ==================================================

        detected_ips = []

        for ip, events in grouped_events.items():

            failed_attempts = len(events)

            if failed_attempts < threshold:
                continue

            usernames = sorted({

                event["username"]

                for event in events

                if event["username"]

            })

            agents = sorted({

                event["agent"]

                for event in events

                if event["agent"]

            })

            if failed_attempts >= threshold * 2:

                severity = "HIGH"

            else:

                severity = "MEDIUM"

            detected_ips.append({

                "ip": ip,

                "failed_attempts": failed_attempts,

                "window_minutes": window_minutes,

                "severity": severity,

                "event_ids": sorted({

                    event["event_id"]

                    for event in events

                }),

                "target_accounts": usernames,

                "agents": agents,

                "first_seen": min(

                    event["timestamp"]

                    for event in events

                ),

                "last_seen": max(

                    event["timestamp"]

                    for event in events

                ),

                "recommended_action": "REVIEW_AND_CONSIDER_BLOCK",

                "events": events,

            })

        # Sắp xếp IP nguy hiểm nhất lên đầu.

        detected_ips.sort(

            key=lambda item: item["failed_attempts"],

            reverse=True

        )

        # ==================================================
        # 3.4 RETURN RESULT
        # ==================================================

        return {

            "status": "success",

            "detector": "windows_brute_force",

            "window_minutes": window_minutes,

            "threshold": threshold,

            "events_scanned": len(hits),

            "detected_count": len(detected_ips),

            "detected_ips": detected_ips,

            "skipped": skipped,

            "automatic_blocking": False,

        }


# ==========================================================
# 4. GLOBAL INSTANCE
# ==========================================================

brute_force_detector = BruteForceDetector()


# ==========================================================
# 5. PUBLIC FUNCTION
# ==========================================================

def detect_brute_force(

    window_minutes=5,

    threshold=5,

    limit=1000,

    protected_ips=None

):

    return brute_force_detector.detect(

        window_minutes=window_minutes,

        threshold=threshold,

        limit=limit,

        protected_ips=protected_ips

    )