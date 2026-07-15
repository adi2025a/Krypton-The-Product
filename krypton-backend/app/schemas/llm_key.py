from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class LLMProvider(str, Enum):
    openai = "openai"
    groq = "groq"
    gemini = "gemini"
    claude = "claude"


class SetLLMKeyRequest(BaseModel):
    provider: LLMProvider
    model_name: str = Field(..., description="e.g. 'gpt-4o', 'llama-3.3-70b-versatile', 'gemini-1.5-pro', 'claude-sonnet-4-6'")
    api_key: str
    expiry_days: Optional[int] = Field(
        default=None,
        ge=1,
        le=90,
        description="Optional override for key TTL. Defaults to server setting (7 days) if omitted.",
    )


class SetLLMKeyResponse(BaseModel):
    provider: LLMProvider
    model_name: str
    is_valid: bool
    message: str
    expires_at: str


class LLMKeyStatusResponse(BaseModel):
    provider: LLMProvider
    model_name: str
    is_active: bool
    is_valid: bool
    expires_at: str