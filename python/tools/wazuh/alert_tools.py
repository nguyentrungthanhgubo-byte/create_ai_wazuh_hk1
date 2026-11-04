import os
import requests
from requests.auth import HTTPBasicAuth
from dotenv import load_dotenv

load_dotenv()


class WazuhAlertTools:

    def __init__(self):
        self.base_url = os.getenv(
            "WAZUH_INDEXER_URL",
            "https://127.0.0.1:9200"
        ).rstrip("/")

        self.username = os.getenv("WAZUH_INDEXER_USERNAME")
        self.password = os.getenv("WAZUH_INDEXER_PASSWORD")

        self.verify_ssl = os.getenv(
            "WAZUH_INDEXER_VERIFY_SSL",
            "false"
        ).lower() == "true"

        self.index = os.getenv(
            "WAZUH_ALERT_INDEX",
            "wazuh-alerts-4.x-*"
        )

    def _search(self, query):
        """Thực hiện truy vấn OpenSearch."""

        if not self.username or not self.password:
            raise ValueError(
                "Missing Wazuh Indexer credentials."
            )

        response = requests.post(
            f"{self.base_url}/{self.index}/_search",
            auth=HTTPBasicAuth(
                self.username,
                self.password
            ),
            json=query,
            verify=self.verify_ssl,
            timeout=30
        )

        response.raise_for_status()

        return response.json()

    @staticmethod
    def _total_hits(result):
        total = result.get(
            "hits", {}
        ).get("total", 0)

        if isinstance(total, dict):
            return total.get("value", 0)

        return total

    @staticmethod
    def _format_alert(hit):
        """
        Chuẩn hóa Wazuh Alert.
        Giữ lại data để các module Threat Detection
        có thể đọc Windows Event ID và Source IP.
        """

        source = hit.get("_source", {})

        return {
            "id": hit.get("_id"),

            "timestamp": (
                source.get("timestamp")
                or source.get("@timestamp")
            ),

            "agent": source.get("agent", {}),

            "rule": source.get("rule", {}),

            "manager": source.get("manager", {}),

            "location": source.get("location"),

            "decoder": source.get("decoder", {}),

            "data": source.get("data", {}),

            "event": source.get("event", {}),

            "full_log": source.get("full_log"),

            "raw": source.get("raw", {})
        }

    def get_alerts(
        self,
        limit=20,
        min_level=None,
        agent_name=None,
        start_time=None,
        end_time=None
    ):

        limit = max(1, min(int(limit), 100))

        filters = []

        if min_level is not None:

            level = int(min_level)

            if not 0 <= level <= 15:
                raise ValueError(
                    "min_level must be between 0 and 15."
                )

            filters.append({
                "range": {
                    "rule.level": {
                        "gte": level
                    }
                }
            })

        if agent_name:

            filters.append({
                "term": {
                    "agent.name": agent_name
                }
            })

        if start_time or end_time:

            time_range = {}

            if start_time:
                time_range["gte"] = start_time

            if end_time:
                time_range["lte"] = end_time

            filters.append({
                "range": {
                    "timestamp": time_range
                }
            })

        query = {
            "size": limit,

            "sort": [
                {
                    "timestamp": {
                        "order": "desc"
                    }
                }
            ],

            "query": {
                "bool": {
                    "filter": filters
                }
            }
        }

        result = self._search(query)

        hits = result.get(
            "hits", {}
        ).get("hits", [])

        alerts = [
            self._format_alert(hit)
            for hit in hits
        ]

        return {
            "total": self._total_hits(result),
            "returned": len(alerts),
            "alerts": alerts
        }

    def get_alert_by_id(self, alert_id):

        query = {
            "size": 1,

            "query": {
                "ids": {
                    "values": [str(alert_id)]
                }
            }
        }

        result = self._search(query)

        hits = result.get(
            "hits", {}
        ).get("hits", [])

        if not hits:
            return None

        return self._format_alert(hits[0])

    def get_critical_alerts(
        self,
        min_level=10,
        limit=20
    ):

        if not 0 <= int(min_level) <= 15:
            raise ValueError(
                "min_level must be between 0 and 15."
            )

        return self.get_alerts(
            limit=limit,
            min_level=min_level
        )

    def get_alert_statistics(self):

        query = {
            "size": 0,

            "aggs": {
                "alerts_by_level": {
                    "terms": {
                        "field": "rule.level",
                        "size": 16,
                        "order": {
                            "_key": "asc"
                        }
                    }
                }
            }
        }

        result = self._search(query)

        buckets = (
            result.get("aggregations", {})
            .get("alerts_by_level", {})
            .get("buckets", [])
        )

        return {
            "total": self._total_hits(result),

            "by_level": [
                {
                    "level": bucket.get("key"),
                    "count": bucket.get("doc_count")
                }
                for bucket in buckets
            ]
        }


# Khởi tạo Wazuh Alert Tools

wazuh_alert_tools = WazuhAlertTools()


# Các hàm tương thích với code cũ

def get_alerts(
    limit=20,
    min_level=None,
    agent_name=None,
    start_time=None,
    end_time=None
):

    return wazuh_alert_tools.get_alerts(
        limit=limit,
        min_level=min_level,
        agent_name=agent_name,
        start_time=start_time,
        end_time=end_time
    )


def get_alert_by_id(alert_id):

    return wazuh_alert_tools.get_alert_by_id(
        alert_id
    )


def get_critical_alerts(
    min_level=10,
    limit=20
):

    return wazuh_alert_tools.get_critical_alerts(
        min_level,
        limit
    )


def get_alert_statistics():

    return wazuh_alert_tools.get_alert_statistics()