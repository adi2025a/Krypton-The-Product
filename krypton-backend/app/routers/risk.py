import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.core.security import get_current_user_id
from app.core.encryption import decrypt_value
from app.models.chart_context import ChartContext
from app.models.integration_key import IntegrationKey
from app.schemas.risk import RiskProfileResponse
from app.services.binance_service import fetch_portfolio
from app.services.risk_service import compute_risk_profile

router = APIRouter()


@router.get("/profile", response_model=RiskProfileResponse)
async def get_risk_profile(
    symbol: Optional[str] = None,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    # Requires Binance -- concentration risk is meaningless without real
    # holdings, same reasoning as risk_node in the agent graph. Unlike
    # indicators/news (always public, always available), this endpoint
    # genuinely can't produce a result without it, so a 404 here is the
    # correct signal for the frontend to show "connect Binance" instead
    # of an empty/broken panel.
    result = await db.execute(
        select(IntegrationKey).where(
            IntegrationKey.user_id == user_id,
            IntegrationKey.platform == "binance",
            IntegrationKey.is_active == True,  # noqa: E712
        )
    )
    binance_key = result.scalar_one_or_none()
    if binance_key is None:
        raise HTTPException(status_code=404, detail="Connect Binance to see risk analysis")

    # Same default-to-saved-context pattern as /market/indicators and /news/feed.
    if symbol is None:
        context_result = await db.execute(select(ChartContext).where(ChartContext.user_id == user_id))
        context = context_result.scalar_one_or_none()
        symbol = context.symbol if context else "BTCUSDT"
        timeframe = context.timeframe if context else "15m"
    else:
        timeframe = "15m"  # explicit symbol override without a saved context timeframe -- reasonable default

    try:
        api_key = decrypt_value(binance_key.encrypted_api_key)
        api_secret = decrypt_value(binance_key.encrypted_api_secret)
        balances = await fetch_portfolio(api_key, api_secret)
    except Exception:
        raise HTTPException(status_code=502, detail="Could not fetch portfolio from Binance right now")

    risk_profile = await compute_risk_profile(balances, symbol, timeframe)
    return RiskProfileResponse(**risk_profile)