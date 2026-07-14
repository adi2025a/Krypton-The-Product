"""
OTP lifecycle: generate -> hash -> store -> (email it) -> verify.

We hash OTPs with bcrypt too -- same "never store the raw value"
principle as passwords. OTPs are short (a few digits) so no need for
the SHA-256 pre-hash step used for passwords in core/security.py.
"""

import random
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.otp_model import OTP


def _hash_otp(raw_otp: str) -> str:
    return bcrypt.hashpw(raw_otp.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_otp_hash(raw_otp: str, otp_hash: str) -> bool:
    return bcrypt.checkpw(raw_otp.encode("utf-8"), otp_hash.encode("utf-8"))


def _generate_numeric_otp() -> str:
    length = settings.OTP_LENGTH
    return "".join(random.choices("0123456789", k=length))


async def create_and_store_otp(db: AsyncSession, user_id: uuid.UUID, purpose: str = "email_verification") -> str:
    """
    Generates a plaintext OTP (returned so we can email it), stores only
    its hash, and invalidates any prior unused OTPs for the same purpose
    so a user can't have multiple valid codes floating around.
    """
    # invalidate previous unused OTPs of the same purpose
    existing = await db.execute(
        select(OTP).where(OTP.user_id == user_id, OTP.purpose == purpose, OTP.is_used == False)  # noqa: E712
    )
    for old_otp in existing.scalars().all():
        old_otp.is_used = True

    raw_otp = _generate_numeric_otp()
    otp_row = OTP(
        user_id=user_id,
        otp_hash=_hash_otp(raw_otp),
        purpose=purpose,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES),
    )
    db.add(otp_row)
    await db.commit()
    return raw_otp


async def verify_otp(db: AsyncSession, user_id: uuid.UUID, submitted_otp: str, purpose: str = "email_verification") -> bool:
    """Checks the most recent unused, unexpired OTP for this user+purpose."""
    result = await db.execute(
        select(OTP)
        .where(OTP.user_id == user_id, OTP.purpose == purpose, OTP.is_used == False)  # noqa: E712
        .order_by(OTP.created_at.desc())
    )
    otp_row = result.scalars().first()

    if otp_row is None:
        return False
    if otp_row.expires_at < datetime.now(timezone.utc):
        return False
    if not _verify_otp_hash(submitted_otp, otp_row.otp_hash):
        return False

    otp_row.is_used = True
    await db.commit()
    return True


def _generate_numeric_otp() -> str:
    length = settings.OTP_LENGTH
    return "".join(random.choices("0123456789", k=length))


async def create_and_store_otp(db: AsyncSession, user_id: uuid.UUID, purpose: str = "email_verification") -> str:
    """
    Generates a plaintext OTP (returned so we can email it), stores only
    its hash, and invalidates any prior unused OTPs for the same purpose
    so a user can't have multiple valid codes floating around.
    """
    # invalidate previous unused OTPs of the same purpose
    existing = await db.execute(
        select(OTP).where(OTP.user_id == user_id, OTP.purpose == purpose, OTP.is_used == False)  # noqa: E712
    )
    for old_otp in existing.scalars().all():
        old_otp.is_used = True

    raw_otp = _generate_numeric_otp()
    otp_row = OTP(
        user_id=user_id,
        otp_hash=_hash_otp(raw_otp),
        purpose=purpose,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES),
    )
    db.add(otp_row)
    await db.commit()
    return raw_otp


async def verify_otp(db: AsyncSession, user_id: uuid.UUID, submitted_otp: str, purpose: str = "email_verification") -> bool:
    """Checks the most recent unused, unexpired OTP for this user+purpose."""
    result = await db.execute(
        select(OTP)
        .where(OTP.user_id == user_id, OTP.purpose == purpose, OTP.is_used == False)  # noqa: E712
        .order_by(OTP.created_at.desc())
    )
    otp_row = result.scalars().first()

    if otp_row is None:
        return False
    if otp_row.expires_at < datetime.now(timezone.utc):
        return False
    if not _verify_otp_hash(submitted_otp, otp_row.otp_hash):
        return False

    otp_row.is_used = True
    await db.commit()
    return True