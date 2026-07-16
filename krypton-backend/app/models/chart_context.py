import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.database.base import Base


class ChartContext(Base):
    """
    Stores ONLY the user's current chart selection (symbol + timeframe).
    One row per user_id, overwritten on every change -- this is live UI
    state, not a history log, so we don't keep old rows around.

    Why this matters: the chatbot and every agent read THIS row to know
    "what is the user currently looking at" instead of trusting whatever
    the frontend claims in each request -- single source of truth.
    """
    __tablename__ = "chart_contexts"

    # user_id IS the primary key -- enforces "exactly one row per user"
    # at the database level, so we never accidentally get two contexts
    # for the same user.
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True
    )

    symbol: Mapped[str] = mapped_column(String(20), nullable=False, default="BTCUSDT")
    timeframe: Mapped[str] = mapped_column(String(10), nullable=False, default="15m")

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )