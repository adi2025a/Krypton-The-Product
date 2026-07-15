import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.database.base import Base


class IntegrationKey(Base):
    """
    Generic table for ANY exchange/platform integration (Binance now,
    Coinbase/Kraken/etc later) -- `platform` is just a string discriminator
    rather than a Binance-specific table, so adding a new platform later
    means adding a new service + router, not a new table.

    One active row per (user_id, platform) at a time, same pattern as
    LLMApiKey -- old rows get is_active=False instead of being deleted.
    """
    __tablename__ = "integration_keys"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    platform: Mapped[str] = mapped_column(String(50), nullable=False)  # "binance" | "coinbase" | ...

    encrypted_api_key: Mapped[str] = mapped_column(Text, nullable=False)
    encrypted_api_secret: Mapped[str] = mapped_column(Text, nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_valid: Mapped[bool] = mapped_column(Boolean, default=True)  # last known validation result

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))