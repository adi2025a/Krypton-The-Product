import time
import uuid

from fastapi import APIRouter, HTTPException

from app.agents.graph import run_chat
from app.models import ChatRequest, ChatResponse

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(payload: ChatRequest):
    try:
        history = [{"role": m.role, "content": m.content} for m in payload.history]
        result = await run_chat(
            message=payload.message,
            history=history,
            credentials=payload.credentials,
            pair=payload.context_pair,
        )
    except Exception as exc:  # surfaces provider auth errors, rate limits, etc. to the UI
        raise HTTPException(status_code=502, detail=f"LLM provider error: {exc}") from exc

    return ChatResponse(
        id=str(uuid.uuid4()),
        content=result["content"],
        timestamp=time.strftime("%H:%M"),
        routed_agent=result.get("routed_agent"),
    )
