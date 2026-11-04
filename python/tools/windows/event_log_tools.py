import os
import requests
from requests.auth import HTTPBasicAuth
from dotenv import load_dotenv

load_dotenv()


class WindowsEventLogTools:
    """
    Truy vấn Windows Event Log đã được Wazuh Agent thu thập
    và lưu trong Wazuh Indexer.
    """

    def __init__(self):
        self.base_url = os.getenv(
            "WAZUH_INDEXER_URL",
            "https://127.0.0.1:9200"
        ).rstrip("/")

        self.username = os.getenv("WAZUH_INDEXER_USERNAME")
        self.password = os.getenv("WAZUH_INDEXER_PASSWORD")

        self.verify_ssl = os.getenv(
            "WAZUH_INDEXER_VERIFY_SSL", "false"
        ).lower() == "true"

        self.index = os.getenv(
            "WAZUH_ALERT_INDEX",
            "wazuh-alerts-4.x-*"
        )

        self.session = requests.Session()
        self.session.auth = HTTPBasicAuth(
            self.username or "",
            self.password or ""
        )
        self.session.verify = self.verify_ssl

    def _search(self, query):
        if not self.username or not self.password:
            raise ValueError(
                "Thiếu WAZUH_INDEXER_USERNAME hoặc "
                "WAZUH_INDEXER_PASSWORD trong file .env"
            )

        response = self.session.post(
            f"{self.base_url}/{self.index}/_search",
            json=query,
            timeout=30
        )
        response.raise_for_status()
        return response.json()

    @staticmethod
    def _total_hits(result):
        total = result.get("hits", {}).get("total", 0)

        if isinstance(total, dict):
            return total.get("value", 0)

        return total

    @staticmethod
    def _format_event(hit):
        source = hit.get("_source", {})

        return {
            "id": hit.get("_id"),
            "timestamp": source.get("timestamp"),
            "agent": source.get("agent", {}),
            "manager": source.get("manager", {}),
            "rule": source.get("rule", {}),
            "event": source.get("data", {}).get("win", {}),
            "location": source.get("location"),
            "full_log": source.get("full_log"),
            "raw": source
        }

    def get_events(
        self,
        limit=20,
        event_id=None,
        agent_name=None,
        start_time=None,
        end_time=None
    ):
        """
        Lấy Windows Event Log từ Wazuh Indexer.

        start_time/end_time dùng định dạng ISO 8601,
        ví dụ: 2026-11-04T00:00:00+07:00
        """

        if not isinstance(limit, int) or not 1 <= limit <= 1000:
            raise ValueError("limit phải là số nguyên từ 1 đến 1000")

        filters = []

        if event_id is not None:
            filters.append({
                "bool": {
                    "should": [
                        {"term": {"data.win.system.eventID": str(event_id)}},
                        {"term": {"data.win.system.eventID": int(event_id)}}
                    ],
                    "minimum_should_match": 1
                }
            })

        if agent_name:
            filters.append({
                "term": {
                    "agent.name": agent_name
                }
            })

        time_range = {}

        if start_time:
            time_range["gte"] = start_time

        if end_time:
            time_range["lte"] = end_time

        if time_range:
            filters.append({
                "range": {
                    "timestamp": time_range
                }
            })

        query = {
            "size": limit,
            "sort": [
                {"timestamp": {"order": "desc"}}
            ],
            "query": {
                "bool": {
                    "filter": filters
                }
            }
        }

        result = self._search(query)
        hits = result.get("hits", {}).get("hits", [])

        return {
            "total": self._total_hits(result),
            "returned": len(hits),
            "events": [
                self._format_event(hit)
                for hit in hits
            ]
        }

    def get_event_by_id(self, event_document_id):
        """Lấy một sự kiện theo document ID của Wazuh Indexer."""

        query = {
            "size": 1,
            "query": {
                "ids": {
                    "values": [event_document_id]
                }
            }
        }

        result = self._search(query)
        hits = result.get("hits", {}).get("hits", [])

        if not hits:
            return None

        return self._format_event(hits[0])

    def get_nps_events(
        self,
        limit=50,
        agent_name=None,
        start_time=None,
        end_time=None
    ):
        """
        Lấy sự kiện NPS/RADIUS:
        6272: NPS cấp quyền truy cập.
        6273: NPS từ chối truy cập.
        """

        granted = self.get_events(
            limit=limit,
            event_id=6272,
            agent_name=agent_name,
            start_time=start_time,
            end_time=end_time
        )

        denied = self.get_events(
            limit=limit,
            event_id=6273,
            agent_name=agent_name,
            start_time=start_time,
            end_time=end_time
        )

        events = granted["events"] + denied["events"]
        events.sort(
            key=lambda item: item.get("timestamp") or "",
            reverse=True
        )

        return {
            "granted_total": granted["total"],
            "denied_total": denied["total"],
            "total": granted["total"] + denied["total"],
            "returned": len(events[:limit]),
            "events": events[:limit]
        }


windows_event_tools = WindowsEventLogTools()


# Các hàm tiện dụng để module khác có thể gọi trực tiếp.

def get_events(
    limit=20,
    event_id=None,
    agent_name=None,
    start_time=None,
    end_time=None
):
    return windows_event_tools.get_events(
        limit=limit,
        event_id=event_id,
        agent_name=agent_name,
        start_time=start_time,
        end_time=end_time
    )


def get_event_by_id(event_document_id):
    return windows_event_tools.get_event_by_id(event_document_id)


def get_nps_events(
    limit=50,
    agent_name=None,
    start_time=None,
    end_time=None
):
    return windows_event_tools.get_nps_events(
        limit=limit,
        agent_name=agent_name,
        start_time=start_time,
        end_time=end_time
    )


if __name__ == "__main__":
    import json

    print("Đang kiểm tra Windows Event Log trong Wazuh Indexer...")

    try:
        result = get_events(limit=5)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except requests.exceptions.RequestException as error:
        print(f"Lỗi kết nối Wazuh Indexer: {error}")
    except Exception as error:
        print(f"Lỗi: {error}")
