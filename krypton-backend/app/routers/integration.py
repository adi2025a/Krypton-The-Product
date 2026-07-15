import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.core.security import get_current_user_id
from app.core.encryption import encrypt_value, decrypt_value
from app.models.integration_key import IntegrationKey
from app.schemas.integration import (
    ConnectBinanceRequest, ConnectBinanceResponse,
    IntegrationStatusResponse, IntegrationPlatform,
    PortfolioResponse, PortfolioBalance,
)
from app.services.binance_service import validate_binance_key, fetch_portfolio

router = APIRouter()

PLATFORM = IntegrationPlatform.binance.value


@router.post("/binance/connect", response_model=ConnectBinanceResponse)
async def connect_binance(
    payload: ConnectBinanceRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    is_valid = await validate_binance_key(payload.api_key, payload.api_secret)

    # deactivate any previous key for this user+platform
    result = await db.execute(
        select(IntegrationKey).where(
            IntegrationKey.user_id == user_id,
            IntegrationKey.platform == PLATFORM,
            IntegrationKey.is_active == True,  # noqa: E712
        )
    )
    for old_key in result.scalars().all():
        old_key.is_active = False

    new_key = IntegrationKey(
        user_id=user_id,
        platform=PLATFORM,
        encrypted_api_key=encrypt_value(payload.api_key),
        encrypted_api_secret=encrypt_value(payload.api_secret),
        is_active=True,
        is_valid=is_valid,
    )
    db.add(new_key)
    await db.commit()

    message = (
        "Binance key verified and saved."
        if is_valid
        else "Key saved, but verification failed. Check the key/secret and permissions."
    )
    return ConnectBinanceResponse(platform=IntegrationPlatform.binance, is_valid=is_valid, message=message)


@router.get("/binance/status", response_model=IntegrationStatusResponse)
async def binance_status(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(IntegrationKey).where(
            IntegrationKey.user_id == user_id,
            IntegrationKey.platform == PLATFORM,
            IntegrationKey.is_active == True,  # noqa: E712
        )
    )
    key_row = result.scalars().first()
    if key_row is None:
        raise HTTPException(status_code=404, detail="No active Binance connection for this user")

    return IntegrationStatusResponse(
        platform=IntegrationPlatform.binance,
        is_active=key_row.is_active,
        is_valid=key_row.is_valid,
    )


@router.get("/binance/portfolio", response_model=PortfolioResponse)
async def binance_portfolio(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(IntegrationKey).where(
            IntegrationKey.user_id == user_id,
            IntegrationKey.platform == PLATFORM,
            IntegrationKey.is_active == True,  # noqa: E712
        )
    )
    key_row = result.scalars().first()
    if key_row is None:
        raise HTTPException(status_code=404, detail="No active Binance connection. Connect one first.")

    api_key = decrypt_value(key_row.encrypted_api_key)
    api_secret = decrypt_value(key_row.encrypted_api_secret)

    try:
        raw_balances = await fetch_portfolio(api_key, api_secret)
    except Exception:
        raise HTTPException(status_code=502, detail="Could not fetch portfolio from Binance. Key may have expired or lost permissions.")

    balances = [PortfolioBalance(**b) for b in raw_balances]
    return PortfolioResponse(platform=IntegrationPlatform.binance, balances=balances)