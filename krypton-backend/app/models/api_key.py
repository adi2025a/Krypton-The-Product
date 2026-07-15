import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.database.base import Base


class LLMApiKey(Base):
    """
    One row per LLM key a user has ever added. Only one row per user
    should have is_active=True at a time -- enforced in the service
    layer (routers/services), not a DB constraint, so we can keep
    history of past keys for auditing.
    """
    __tablename__ = "llm_api_keys"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    provider: Mapped[str] = mapped_column(String(50), nullable=False)   # "openai" | "groq" | "gemini" | "claude"
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. "gpt-4o", "llama-3.3-70b"

    encrypted_key: Mapped[str] = mapped_column(Text, nullable=False)  # ciphertext from core/encryption.py

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_valid: Mapped[bool] = mapped_column(Boolean, default=True)  # last known validation result

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)