
# import os
# import json
# import httpx
# from dotenv import load_dotenv

# load_dotenv()

# KAGGLE_AI_URL = os.getenv("KAGGLE_AI_URL", "").rstrip("/")
# KAGGLE_AI_TOKEN = os.getenv("KAGGLE_AI_TOKEN", "")


# async def ask_kaggle_qwen(prompt: str, context: dict, agent: str = "log_analysis"):
#     if not KAGGLE_AI_URL:
#         raise RuntimeError("Chưa cấu hình KAGGLE_AI_URL trong .env")

#     if not KAGGLE_AI_TOKEN:
#         raise RuntimeError("Chưa cấu hình KAGGLE_AI_TOKEN trong .env")

#     # Gửi cả câu hỏi và dữ liệu Wazuh lên Kaggle
#     full_prompt = (
#         f"CÂU HỎI:\n{prompt}\n\n"
#         f"DỮ LIỆU HỆ THỐNG:\n"
#         f"{json.dumps(context, ensure_ascii=False, indent=2, default=str)}"
#     )

#     headers = {
#         "Authorization": f"Bearer {KAGGLE_AI_TOKEN}",
#         "Content-Type": "application/json"
#     }

#     payload = {
#         "prompt": full_prompt,
#         "agent": agent
#     }

#     async with httpx.AsyncClient(timeout=300) as client:
#         response = await client.post(
#             f"{KAGGLE_AI_URL}/analyze",
#             json=payload,
#             headers=headers
#         )

#         response.raise_for_status()
#         result = response.json()

#     # Trả kết quả Qwen về backend
#     return result.get("result") or result.get("response") or result.get("answer") or result




import random
from datetime import datetime


def _get_alert_source(alert):
    return alert.get("_source") or alert


def _get_value(source, *keys, default="N/A"):
    for key in keys:
        value = source.get(key)
        if value not in (None, ""):
            return value
    return default


def _format_alerts(alerts):
    if not alerts:
        return (
            "Hiện chưa có dữ liệu cảnh báo được cung cấp "
            "cho phiên phân tích này. Bạn cần kiểm tra "
            "kết nối Wazuh/OpenSearch hoặc khoảng thời gian truy vấn."
        )

    lines = []

    for index, alert in enumerate(alerts[:5], start=1):
        source = _get_alert_source(alert)

        rule = source.get("rule") or {}

        timestamp = _get_value(
            source, "@timestamp", "timestamp"
        )
        description = _get_value(
            rule, "description", default="Không có mô tả"
        )
        level = _get_value(
            rule, "level", default="N/A"
        )
        rule_id = _get_value(
            rule, "id", default="N/A"
        )
        agent = source.get("agent") or {}
        agent_name = _get_value(
            agent, "name", default="N/A"
        )

        lines.append(
            f"{index}. {description}\n"
            f"   - Thời gian: {timestamp}\n"
            f"   - Mức độ: {level}\n"
            f"   - Rule ID: {rule_id}\n"
            f"   - Agent: {agent_name}"
        )

    return "\n".join(lines)


def _detect_intent(prompt):
    p = prompt.lower()

    if any(x in p for x in [
        "brute force", "brute-force", "đăng nhập thất bại",
        "đăng nhập sai", "4625", "password"
    ]):
        return "brute_force"

    if any(x in p for x in [
        "ip", "địa chỉ nguồn", "nguồn tấn công"
    ]):
        return "ip"

    if any(x in p for x in [
        "cảnh báo", "alert", "threat", "nguy hiểm",
        "tấn công", "sự cố"
    ]):
        return "alerts"

    if any(x in p for x in [
        "server", "máy chủ", "hệ thống", "tình trạng"
    ]):
        return "server"

    if any(x in p for x in [
        "xin chào", "hello", "hi", "chào"
    ]):
        return "greeting"

    return "general"


async def ask_kaggle_qwen(
    prompt: str,
    context: dict,
    agent: str = "log_analysis"
):
    """
    Mock AI Engine:
    - Không gọi Kaggle.
    - Không gọi Qwen.
    - Không gọi API AI bên ngoài.
    - Tạo phản hồi theo từ khóa và dữ liệu context.
    """

    prompt = str(prompt or "").strip()
    context = context or {}

    if not prompt:
        return "Xin chào! Tôi có thể giúp bạn phân tích an ninh hệ thống Wazuh."

    intent = _detect_intent(prompt)
    alerts = context.get("alerts") or []
    alert_count = len(alerts)

    now = datetime.now().strftime("%d/%m/%Y %H:%M:%S")

    if intent == "greeting":
        return (
            "Xin chào! Tôi là Wazuh AI Security Assistant.\n\n"
            "Tôi có thể hỗ trợ bạn:\n"
            "- Phân tích cảnh báo bảo mật.\n"
            "- Kiểm tra dấu hiệu Brute Force.\n"
            "- Phân tích IP đáng ngờ.\n"
            "- Đánh giá tình trạng máy chủ.\n"
            "- Đưa ra khuyến nghị xử lý sự cố."
        )

    if intent == "brute_force":
        return (
            "PHÂN TÍCH BRUTE FORCE\n\n"
            f"Thời điểm phản hồi: {now}\n"
            f"Số cảnh báo được cung cấp: {alert_count}\n\n"
            "Kết quả phân tích:\n"
            f"{_format_alerts(alerts)}\n\n"
            "Khuyến nghị:\n"
            "1. Kiểm tra các sự kiện đăng nhập thất bại.\n"
            "2. Xác định IP nguồn và tài khoản mục tiêu.\n"
            "3. Đối chiếu tần suất và khoảng thời gian xảy ra.\n"
            "4. Kiểm tra đăng nhập thành công sau các lần thất bại.\n"
            "5. Cân nhắc chặn IP sau khi xác minh.\n\n"
            "Lưu ý: Không thể kết luận Brute Force chỉ từ "
            "một vài sự kiện đăng nhập thất bại."
        )

    if intent == "ip":
        return (
            "PHÂN TÍCH ĐỊA CHỈ IP\n\n"
            f"Số cảnh báo được cung cấp: {alert_count}\n\n"
            f"{_format_alerts(alerts)}\n\n"
            "Khuyến nghị: Kiểm tra IP nguồn, tần suất kết nối, "
            "tài khoản liên quan và lịch sử truy cập trước "
            "khi thực hiện hành động chặn."
        )

    if intent == "alerts":
        return (
            "BÁO CÁO CẢNH BÁO BẢO MẬT\n\n"
            f"Thời điểm: {now}\n"
            f"Tổng số bản ghi cảnh báo được cung cấp: {alert_count}\n\n"
            f"{_format_alerts(alerts)}\n\n"
            "Khuyến nghị:\n"
            "- Ưu tiên kiểm tra cảnh báo có mức độ cao.\n"
            "- Xác minh nguồn phát sinh cảnh báo.\n"
            "- Đối chiếu các sự kiện liên quan trên cùng Agent."
        )

    if intent == "server":
        return (
            "ĐÁNH GIÁ TÌNH TRẠNG HỆ THỐNG\n\n"
            f"Thời điểm phân tích: {now}\n"
            f"Số cảnh báo nhận được: {alert_count}\n\n"
            f"{_format_alerts(alerts)}\n\n"
            "Đề xuất:\n"
            "1. Kiểm tra trạng thái Wazuh Agent.\n"
            "2. Theo dõi các cảnh báo bảo mật mới.\n"
            "3. Kiểm tra Windows Event Log.\n"
            "4. Kiểm tra các lần đăng nhập thất bại.\n\n"
            "Lưu ý: Đây là báo cáo được tạo bằng Mock AI, "
            "không phải kết quả đánh giá tự động bằng mô hình AI."
        )

    responses = [
        (
            "Tôi đã tiếp nhận yêu cầu của bạn.\n\n"
            "Với vai trò Wazuh Security Assistant, tôi có thể "
            "hỗ trợ phân tích log, cảnh báo, IP và các dấu hiệu "
            "tấn công bảo mật.\n\n"
            "Bạn hãy thử hỏi về Brute Force, cảnh báo Wazuh "
            "hoặc tình trạng máy chủ."
        ),
        (
            "Đã phân tích nội dung yêu cầu.\n\n"
            "Để đánh giá sự cố bảo mật, cần đối chiếu cảnh báo "
            "Wazuh, nguồn phát sinh sự kiện và thời gian xảy ra.\n\n"
            f"Số cảnh báo hiện được cung cấp: {alert_count}."
        )
    ]

    return random.choice(responses)
