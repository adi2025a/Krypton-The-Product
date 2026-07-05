from __future__ import annotations

from typing import List, Optional, TypedDict

from app.models import LLMCredentials


class ChatTurn(TypedDict):
    role: str  # "user" | "assistant"
    content: str


class AgentState(TypedDict, total=False):
    # inputs
    user_message: str
    history: List[ChatTurn]
    pair: str
    credentials: LLMCredentials

    # supervisor decision
    route: str  # "market" | "sentiment" | "risk" | "onchain" | "general"

    # per-agent grounding context (filled in by whichever node(s) ran)
    market_context: Optional[str]
    sentiment_context: Optional[str]
    risk_context: Optional[str]
    onchain_context: Optional[str]

    # output
    final_response: str
    routed_agent: Optional[str]
