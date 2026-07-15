import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.core.security import get_current_user_id
from app.models.user_model import User
from app.models.api_key import LLMApiKey
from app.models.integration_key import IntegrationKey
from app.schemas.status import OnboardingStatusResponse

router = APIRouter()


@router.get("/onboarding", response_model=OnboardingStatusResponse)
async def onboarding_status(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one()

    llm_key = (
        await db.execute(
            select(LLMApiKey).where(LLMApiKey.user_id == user_id, LLMApiKey.is_active == True)  # noqa: E712
        )
    ).scalars().first()

    binance_key = (
        await db.execute(
            select(IntegrationKey).where(
                IntegrationKey.user_id == user_id,
                IntegrationKey.platform == "binance",
                IntegrationKey.is_active == True,  # noqa: E712
            )
        )
    ).scalars().first()

    return OnboardingStatusResponse(
        email_verified=user.is_verified,
        llm_key_set=llm_key is not None,
        llm_key_valid=llm_key.is_valid if llm_key else False,
        binance_connected=binance_key is not None,
        binance_key_valid=binance_key.is_valid if binance_key else False,
    )