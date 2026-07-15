import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.core.security import get_current_user_id
from app.core.encryption import encrypt_value
from app.core.config import settings
from app.models.api_key import LLMApiKey
from app.schemas.llm_key import SetLLMKeyRequest, SetLLMKeyResponse, LLMKeyStatusResponse
from app.services.llm_key_service import validate_llm_key

router = APIRouter()


@router.post("/set", response_model=SetLLMKeyResponse)
async def set_llm_key(
    payload: SetLLMKeyRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    # 1. Test the key against the real provider before storing anything.
    is_valid = await validate_llm_key(payload.provider.value, payload.api_key)

    # 2. Deactivate any previously active key for this user (we keep one active key at a time).
    result = await db.execute(
        select(LLMApiKey).where(LLMApiKey.user_id == user_id, LLMApiKey.is_active == True)  # noqa: E712
    )
    for old_key in result.scalars().all():
        old_key.is_active = False

    # 3. Encrypt and store the new key.
    ttl_days = payload.expiry_days or settings.LLM_KEY_DEFAULT_TTL_DAYS
    expires_at = datetime.now(timezone.utc) + timedelta(days=ttl_days)

    new_key = LLMApiKey(
        user_id=user_id,
        provider=payload.provider.value,
        model_name=payload.model_name,
        encrypted_key=encrypt_value(payload.api_key),
        is_active=True,
        is_valid=is_valid,
        expires_at=expires_at,
    )
    db.add(new_key)
    await db.commit()

    message = (
        "Key verified and saved successfully."
        if is_valid
        else "Key saved, but it failed provider verification. Double-check it and update if needed."
    )

    return SetLLMKeyResponse(
        provider=payload.provider,
        model_name=payload.model_name,
        is_valid=is_valid,
        message=message,
        expires_at=expires_at.isoformat(),
    )


@router.get("/status", response_model=LLMKeyStatusResponse)
async def get_llm_key_status(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LLMApiKey).where(LLMApiKey.user_id == user_id, LLMApiKey.is_active == True)  # noqa: E712
    )
    key_row = result.scalars().first()
    if key_row is None:
        raise HTTPException(status_code=404, detail="No active LLM key set for this user")

    return LLMKeyStatusResponse(
        provider=key_row.provider,
        model_name=key_row.model_name,
        is_active=key_row.is_active,
        is_valid=key_row.is_valid,
        expires_at=key_row.expires_at.isoformat(),
    )