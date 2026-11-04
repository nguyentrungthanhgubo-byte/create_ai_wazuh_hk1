
from engines.opensearch_engine import search_wazuh_alerts
from engines.ai_agent_engine import ask_kaggle_qwen
from tools.threat.brute_force_detector import detect_brute_force

SYSTEM = (
    "Bạn là Wazuh AI Assistant. Trả lời bằng tiếng Việt. "
    "Chỉ kết luận dựa trên dữ liệu được cung cấp; "
    "không tự bịa IP, rule ID, mức độ hay thời gian. "
    "Nếu thiếu dữ liệu, nói rõ."
)


async def handle_chat(
    conversation_id: str,
    prompt: str,
    skill: str = "general"
):
    p = prompt.lower()

    need_alerts = (
        skill.lower() in {
            "wazuh", "alerts", "security", "vulnerability"
        }
        or any(x in p for x in [
            "cảnh báo", "alert", "wazuh",
            "đăng nhập thất bại", "tấn công", "threat"
        ])
    )

    # Lấy dữ liệu cảnh báo từ OpenSearch
    hits = await search_wazuh_alerts(prompt) if need_alerts else []

    context = {
        "conversation_id": conversation_id,
        "skill": skill,
        "system_instruction": SYSTEM,
        "alerts": hits,
        "alert_count": len(hits)
    }

    # Gọi Qwen trên Kaggle thay cho OpenAI
    answer = await ask_kaggle_qwen(
        prompt=prompt,
        context=context,
        agent="log_analysis"
    )

    sources = [
        {
            "type": "opensearch",
            "index": h.get("_index"),
            "id": h.get("_id"),
            "timestamp": (h.get("_source") or {}).get("@timestamp")
        }
        for h in hits
    ]

    return {
        "answer": answer,
        "sources": sources
    }

async def handle_brute_force_detection(
    window_minutes: int = 5,
    threshold: int = 5,
    limit: int = 1000
):
    result = detect_brute_force(
        window_minutes=window_minutes,
        threshold=threshold,
        limit=limit,
        protected_ips=[
            "192.168.100.1",
            "192.168.100.100"
        ]
    )

    return {
        "errCode": 0,
        "data": result
    }
