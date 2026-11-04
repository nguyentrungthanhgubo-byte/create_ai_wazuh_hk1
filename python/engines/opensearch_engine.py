
import os
import re
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv


# ============================================================
# 1. LOAD ENVIRONMENT CONFIGURATION
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env")

# OpenSearch configuration
OPENSEARCH_URL = os.getenv(
    "OPENSEARCH_URL",
    "https://127.0.0.1:9200"
).rstrip("/")

OPENSEARCH_USER = os.getenv("OPENSEARCH_USER", "admin")
OPENSEARCH_PASSWORD = os.getenv("OPENSEARCH_PASSWORD", "")
OPENSEARCH_VERIFY_SSL = (
    os.getenv("OPENSEARCH_VERIFY_SSL", "false").lower() == "true"
)

WAZUH_ALERT_INDEX = os.getenv(
    "WAZUH_ALERT_INDEX",
    "wazuh-alerts-4.x-*"
)

# OpenAI configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

TIMEOUT = float(os.getenv("OPENSEARCH_TIMEOUT", "90"))


# ============================================================
# 2. OPENSEARCH CLIENT
# ============================================================

def client() -> httpx.AsyncClient:
    if not OPENSEARCH_PASSWORD:
        raise RuntimeError(
            "OPENSEARCH_PASSWORD chưa được cấu hình trong .env"
        )

    return httpx.AsyncClient(
        base_url=OPENSEARCH_URL,
        auth=(OPENSEARCH_USER, OPENSEARCH_PASSWORD),
        verify=OPENSEARCH_VERIFY_SSL,
        timeout=TIMEOUT,
        headers={"Content-Type": "application/json"}
    )


# ============================================================
# 3. SEARCH WAZUH ALERTS
# ============================================================

async def search_wazuh_alerts(
    prompt: str,
    size: int = 15
) -> list[dict[str, Any]]:

    query: dict[str, Any] = {
        "bool": {
            "filter": [
                {
                    "range": {
                        "@timestamp": {
                            "gte": "now-24h",
                            "lte": "now"
                        }
                    }
                }
            ]
        }
    }

    ip = re.search(r"\b(?:\d{1,3}\.){3}\d{1,3}\b", prompt)

    if ip:
        query["bool"]["must"] = [
            {
                "query_string": {
                    "query": f'"{ip.group(0)}"',
                    "fields": [
                        "data.srcip",
                        "data.dstip",
                        "full_log",
                        "message"
                    ]
                }
            }
        ]

    body = {
        "size": min(max(size, 1), 50),
        "sort": [
            {
                "@timestamp": {
                    "order": "desc",
                    "unmapped_type": "date"
                }
            }
        ],
        "_source": [
            "@timestamp",
            "rule",
            "agent",
            "manager",
            "location",
            "decoder",
            "data",
            "full_log"
        ],
        "query": query
    }

    async with client() as c:
        response = await c.post(
            f"/{WAZUH_ALERT_INDEX}/_search",
            json=body
        )
        response.raise_for_status()

        return response.json().get("hits", {}).get("hits", [])

# ============================================================
# 4. CALL OPENAI DIRECTLY
# ============================================================

async def ask_gpt(
    system_prompt: str,
    prompt: str,
    context: dict[str, Any]
) -> str:

    if not OPENAI_API_KEY:
        raise RuntimeError(
            "OPENAI_API_KEY chưa được cấu hình trong file .env"
        )

    context_text = __import__("json").dumps(
        context,
        ensure_ascii=False,
        default=str
    )

    messages = [
        {
            "role": "system",
            "content": (
                system_prompt
                + "\n\n"
                + "Bạn phải trả lời bằng tiếng Việt. "
                + "Chỉ kết luận dựa trên dữ liệu được cung cấp. "
                + "Không tự bịa IP, rule ID, thời gian hoặc mức độ cảnh báo. "
                + "Nếu thiếu dữ liệu, hãy nói rõ."
            )
        },
        {
            "role": "user",
            "content": (
                f"CÂU HỎI:\n{prompt}\n\n"
                f"DỮ LIỆU OPENSEARCH (JSON):\n{context_text}\n\n"
                "Hãy phân biệt dữ liệu thực tế và nhận định phân tích."
            )
        }
    ]

    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }

    body = {
        "model": OPENAI_MODEL,
        "messages": messages,
        "temperature": 0.2
    }

    async with httpx.AsyncClient(timeout=TIMEOUT) as c:
        response = await c.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=body
        )

        if response.status_code != 200:
            print("OpenAI API Error:", response.status_code)
            print("Chi tiết:", response.text)
            response.raise_for_status()

        result = response.json()

    choices = result.get("choices", [])

    if not choices:
        raise RuntimeError(
            "OpenAI không trả về kết quả."
        )

    answer = choices[0].get("message", {}).get("content")

    if not isinstance(answer, str) or not answer.strip():
        raise RuntimeError(
            "Nội dung phản hồi từ OpenAI không hợp lệ."
        )

    return answer.strip()


# ============================================================
# 5. TEST OPENSEARCH CONNECTION
# ============================================================

async def test_opensearch_connection() -> dict[str, Any]:

    async with client() as c:
        response = await c.get("/")
        response.raise_for_status()
        return response.json()


# ============================================================
# 6. TEST OPENAI CONNECTION
# ============================================================

async def test_openai_connection() -> str:

    return await ask_gpt(
        system_prompt="Bạn là trợ lý kiểm tra kết nối AI.",
        prompt="Hãy trả lời chính xác: OpenAI API đã kết nối thành công.",
        context={}
    )
