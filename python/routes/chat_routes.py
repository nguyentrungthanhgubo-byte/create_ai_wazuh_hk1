
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from controllers.chat_controller import (
    handle_chat,
    handle_brute_force_detection
)

router = APIRouter()


class ChatPayload(BaseModel):
    conversation_id: str
    prompt: str = Field(min_length=1, max_length=12000)
    skill: str = "general"


# API CHAT AI
@router.post("/chat")
async def chat(payload: ChatPayload):
    try:
        return {
            "errCode": 0,
            "response": await handle_chat(
                payload.conversation_id,
                payload.prompt,
                payload.skill
            )
        }
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


# API BRUTE FORCE DETECTION
@router.get("/threats/brute-force")
async def get_brute_force(
    window_minutes: int = Query(default=5, ge=1, le=1440),
    threshold: int = Query(default=5, ge=2, le=10000),
    limit: int = Query(default=1000, ge=1, le=10000)
):
    try:
        return await handle_brute_force_detection(
            window_minutes=window_minutes,
            threshold=threshold,
            limit=limit
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc)
        )
