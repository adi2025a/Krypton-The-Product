from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models.user_model import User
from app.schemas.auth_schema import (
    SignupRequest, SignupResponse,
    VerifyOTPRequest,
    LoginRequest, TokenResponse,
    ResendOTPRequest,
)
from app.core.security import hash_password, verify_password, create_access_token
from app.services.otp_service import create_and_store_otp, verify_otp
from app.services.email_service import send_otp_email

import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: SignupRequest, db: AsyncSession = Depends(get_db)):
    logger.info(f"Signup for {payload.email}")
    existing = await db.execute(select(User).where(User.email == payload.email))
    user = existing.scalar_one_or_none()

    if user is not None:
        if user.is_verified:
            # A genuinely registered, verified account -- block it.
            raise HTTPException(status_code=400, detail="Email already registered")
        # Account exists but never verified (e.g. they lost the OTP, or
        # never finished the flow) -- treat this as "retry signup":
        # refresh their password in case it changed, and resend a new OTP.
        user.hashed_password = hash_password(payload.password)
        await db.commit()
    else:
        user = User(email=payload.email, hashed_password=hash_password(payload.password))
        db.add(user)
        await db.commit()
        await db.refresh(user)

    otp = await create_and_store_otp(db, user.id, purpose="email_verification")
    await send_otp_email(user.email, otp)

    return SignupResponse(message="Signup successful. OTP sent to your email.", email=user.email)


@router.post("/verify-otp", status_code=status.HTTP_200_OK)
async def verify_signup_otp(payload: VerifyOTPRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_verified:
        return {"message": "Email already verified"}

    is_valid = await verify_otp(db, user.id, payload.otp, purpose="email_verification")
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    user.is_verified = True
    await db.commit()
    return {"message": "Email verified successfully. You can now log in."}


@router.post("/resend-otp", status_code=status.HTTP_200_OK)
async def resend_otp(payload: ResendOTPRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_verified:
        return {"message": "Email already verified"}

    otp = await create_and_store_otp(db, user.id, purpose="email_verification")
    await send_otp_email(user.email, otp)
    return {"message": "OTP resent"}


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    # Same generic error for "no such user" and "wrong password" --
    # avoids leaking which part was wrong (prevents email enumeration).
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Email not verified. Please verify OTP first.")

    token = create_access_token(user.id)
    return TokenResponse(access_token=token)