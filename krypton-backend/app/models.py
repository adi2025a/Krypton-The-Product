"""
Shared Pydantic models / schemas for requests & responses.
These mirror the TypeScript interfaces used by the Krypton frontend
(Message, NewsItem, AgentTask, PricePoint, LLMProvider) so the JSON
returned by the API can be dropped straight into the existing React state.
"""

from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

SentimentType = Literal["bullish", "bearish", "neutral"]
AgentStatus = Literal["running", "completed", "error", "pending"]
Role = Literal["user", "assistant"]
ProviderId = Literal["openai", "anthropic", "google", "groq", "mistral"]


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: str
    name: str
    email: str


# ---------------------------------------------------------------------------
# LLM credentials — sent with every request that needs to call a model.
# Krypton is "non-custodial": the key is never persisted server-side, it is
# only held in memory for the duration of a single request.
# ---------------------------------------------------------------------------

class LLMCredentials(BaseModel):
    provider: ProviderId
    model: str
    api_key: str = Field(..., description="BYOK key, used in-memory only, never stored")

class BinanceCredentialsIn(BaseModel):
    api_key: str
    api_secret: str

    @field_validator("api_key", "api_secret")
    @classmethod
    def not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("must not be empty")
        return v
# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------

class ChatMessageIn(BaseModel):
    role: Role
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessageIn] = []
    credentials: LLMCredentials
    context_pair: Optional[str] = Field(default="BTC/USDT", description="Trading pair currently open in the chart")


class ChatResponse(BaseModel):
    id: str
    role: Role = "assistant"
    content: str
    timestamp: str
    routed_agent: Optional[str] = None  # which sub-agent (if any) produced the grounding data


# ---------------------------------------------------------------------------
# News
# ---------------------------------------------------------------------------

class NewsItem(BaseModel):
    id: str
    headline: str
    source: str
    time: str
    url: Optional[str] = None
    summary: str
    sentiment: SentimentType
    sentimentScore: int


class NewsListResponse(BaseModel):
    items: List[NewsItem]
    overall_sentiment: SentimentType
    overall_score: int


# ---------------------------------------------------------------------------
# Market data
# ---------------------------------------------------------------------------

class PricePoint(BaseModel):
    time: str
    price: float
    volume: float


class PriceSeriesResponse(BaseModel):
    pair: str
    timeframe: str
    points: List[PricePoint]
    current_price: float
    change_pct: float


# ---------------------------------------------------------------------------
# Agents
# ---------------------------------------------------------------------------

class AgentTask(BaseModel):
    id: str
    agentName: str
    status: AgentStatus
    task: str
    result: Optional[str] = None
    timestamp: str
    duration: Optional[str] = None


class AgentRunRequest(BaseModel):
    agent_name: Literal["MarketScanner", "SentimentAgent", "RiskAnalyzer", "OnChainAgent"]
    credentials: LLMCredentials
    pair: Optional[str] = "BTC/USDT"


TokenResponse.model_rebuild()
