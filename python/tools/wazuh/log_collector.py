
import os
import json
import logging
from pathlib import Path
from datetime import datetime, timezone

import requests
from requests.auth import HTTPBasicAuth
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parents[2]
OUTPUT_DIR = BASE_DIR / "data" / "raw" / "alerts"

logger = logging.getLogger(__name__)


class WazuhLogCollector:
    def __init__(self):
        self.base_url = os.getenv(
            "WAZUH_INDEXER_URL",
            "https://127.0.0.1:9200"
        ).rstrip("/")

        self.username = os.getenv("WAZUH_INDEXER_USERNAME")
        self.password = os.getenv("WAZUH_INDEXER_PASSWORD")

        self.index = os.getenv(
            "WAZUH_ALERT_INDEX",
            "wazuh-alerts-4.x-*"
        )

        self.verify_ssl = os.getenv(
            "WAZUH_INDEXER_VERIFY_SSL", "false"
        ).lower() == "true"

        self.page_size = 500
        self.scroll_timeout = "2m"

        self.session = requests.Session()
        self.session.auth = HTTPBasicAuth(
            self.username or "",
            self.password or ""
        )
        self.session.verify = self.verify_ssl

    def _output_file(self):
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        return OUTPUT_DIR / f"alerts-{today}.jsonl"

    def _load_existing_ids(self, output_file):
        existing_ids = set()

        if not output_file.exists():
            return existing_ids

        with output_file.open("r", encoding="utf-8") as file:
            for line in file:
                try:
                    record = json.loads(line)
                    if record.get("_id"):
                        existing_ids.add(record["_id"])
                except json.JSONDecodeError:
                    logger.warning("Skipping invalid JSONL line.")

        return existing_ids

    def collect_alerts(
        self,
        start_time=None,
        end_time=None,
        min_level=None,
        agent_name=None,
        max_records=5000
    ):
        if not self.username or not self.password:
            raise ValueError(
                "Missing Wazuh Indexer credentials."
            )

        max_records = max(1, min(int(max_records), 50000))

        filters = []

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

        if min_level is not None:
            level = int(min_level)

            if not 0 <= level <= 15:
                raise ValueError(
                    "min_level must be between 0 and 15."
                )

            filters.append({
                "range": {
                    "rule.level": {"gte": level}
                }
            })

        if agent_name:
            filters.append({
                "term": {
                    "agent.name": agent_name
                }
            })

        query = {
            "size": self.page_size,
            "sort": [
                {"timestamp": {"order": "asc"}}
            ],
            "query": {
                "bool": {
                    "filter": filters
                }
            }
        }

        output_file = self._output_file()
        existing_ids = self._load_existing_ids(output_file)

        collected = 0
        saved = 0
        scroll_id = None

        try:
            response = self.session.post(
                f"{self.base_url}/{self.index}/_search",
                params={"scroll": self.scroll_timeout},
                json=query,
                timeout=60
            )
            response.raise_for_status()

            result = response.json()
            scroll_id = result.get("_scroll_id")

            with output_file.open("a", encoding="utf-8") as file:
                while True:
                    hits = result.get("hits", {}).get("hits", [])

                    if not hits or collected >= max_records:
                        break

                    for hit in hits:
                        if collected >= max_records:
                            break

                        collected += 1
                        alert_id = hit.get("_id")

                        if not alert_id or alert_id in existing_ids:
                            continue

                        record = {
                            "_id": alert_id,
                            "_index": hit.get("_index"),
                            "collected_at": datetime.now(
                                timezone.utc
                            ).isoformat(),
                            "alert": hit.get("_source", {})
                        }

                        file.write(
                            json.dumps(
                                record,
                                ensure_ascii=False
                            ) + "\n"
                        )

                        existing_ids.add(alert_id)
                        saved += 1

                    if not scroll_id or collected >= max_records:
                        break

                    response = self.session.post(
                        f"{self.base_url}/_search/scroll",
                        json={
                            "scroll": self.scroll_timeout,
                            "scroll_id": scroll_id
                        },
                        timeout=60
                    )
                    response.raise_for_status()

                    result = response.json()
                    scroll_id = result.get("_scroll_id")

        finally:
            if scroll_id:
                try:
                    self.session.delete(
                        f"{self.base_url}/_search/scroll",
                        json={"scroll_id": [scroll_id]},
                        timeout=15
                    )
                except requests.RequestException:
                    logger.warning("Could not clear scroll context.")

        return {
            "collected": collected,
            "saved": saved,
            "duplicates_skipped": collected - saved,
            "file": str(output_file)
        }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    collector = WazuhLogCollector()

    result = collector.collect_alerts(
        max_records=1000
    )

    print(json.dumps(result, indent=4, ensure_ascii=False))
