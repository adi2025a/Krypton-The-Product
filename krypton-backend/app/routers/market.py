import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.core.security import get_current_user_id
from app.models.chart_context import ChartContext
from app.schemas.market import IndicatorResponse
from app.services.market_data_service import fetch_ohlcv
from app.services.indicator_service import compute_indicators

router = APIRouter()


@router.get("/indicators", response_model=IndicatorResponse)
async def get_indicators(
    symbol: Optional[str] = None,
    timeframe: Optional[str] = None,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    # Fall back to the user's saved chart context if not explicitly overridden.
    if symbol is None or timeframe is None:
        result = await db.execute(select(ChartContext).where(ChartContext.user_id == user_id))
        context = result.scalar_one_or_none()
        symbol = symbol or (context.symbol if context else "BTCUSDT")
        timeframe = timeframe or (context.timeframe if context else "15m")

    try:
        candles = await fetch_ohlcv(symbol, timeframe, limit=200)
    except Exception:
        raise HTTPException(status_code=502, detail=f"Could not fetch market data for {symbol} ({timeframe})")

    if len(candles) < 50:
        raise HTTPException(status_code=422, detail="Not enough candle history to compute indicators reliably")

    indicators = compute_indicators(candles)

    return IndicatorResponse(symbol=symbol, timeframe=timeframe, **indicators)