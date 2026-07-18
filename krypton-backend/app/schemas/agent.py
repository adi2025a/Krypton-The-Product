from typing import Optional
from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str


class AgentResponse(BaseModel):
    final_response: Optional[str]
    indicators: Optional[dict] = None
    news_items: Optional[list[dict]] = None
    sentiment_summary: Optional[dict] = None
    risk_profile: Optional[dict] = None
    errors: list[str] = []