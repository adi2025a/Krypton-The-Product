# app/routers/binance_router.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.db import get_db
from app.database.db_models import BinanceCredentials
from app.crypto import encrypt_secret
from app.auth import get_current_user  # your existing auth dependency
from app.models import BinanceCredentialsIn
from app.services.binance_client import verify_binance_key  # see note below

router = APIRouter(prefix="/api/binance", tags=["binance"])

@router.patch("/credentials", status_code=status.HTTP_200_OK)
async def upsert_binance_credentials(
    payload: BinanceCredentialsIn,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    # 1. Validate the key against Binance BEFORE storing anything.
    #    Also check withdrawals are disabled on this key.
    try:
        permissions = await verify_binance_key(payload.api_key, payload.api_secret)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Binance API credentials")

    if permissions.get("enableWithdrawals"):
        raise HTTPException(
            status_code=400,
            detail="This API key allows withdrawals. Please create a key with withdrawals disabled.",
        )

    # 2. Encrypt before touching the DB
    key_nonce, key_ct = encrypt_secret(payload.api_key)
    secret_nonce, secret_ct = encrypt_secret(payload.api_secret)

    # 3. Upsert
    result = await db.execute(
        select(BinanceCredentials).where(BinanceCredentials.user_id == current_user.id)
    )
    row = result.scalar_one_or_none()

    if row is None:
        row = BinanceCredentials(user_id=current_user.id)
        db.add(row)

    row.api_key_nonce = key_nonce
    row.api_key_ciphertext = key_ct
    row.api_secret_nonce = secret_nonce
    row.api_secret_ciphertext = secret_ct

    await db.commit()

    # 4. Never echo the key/secret back in the response
    return {"status": "ok", "message": "Binance credentials saved"}