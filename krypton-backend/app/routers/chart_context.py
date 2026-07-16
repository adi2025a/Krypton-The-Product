import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.core.security import get_current_user_id
from app.models.chart_context import ChartContext
from app.schemas.chart_context import SetChartContextRequest, ChartContextResponse

router = APIRouter()


@router.put("/chart", response_model=ChartContextResponse)
async def set_chart_context(
    payload: SetChartContextRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(ChartContext).where(ChartContext.user_id == user_id))
    context = existing.scalar_one_or_none()

    if context is None:
        context = ChartContext(user_id=user_id, symbol=payload.symbol, timeframe=payload.timeframe.value)
        db.add(context)
    else:
        context.symbol = payload.symbol
        context.timeframe = payload.timeframe.value

    await db.commit()
    return ChartContextResponse(symbol=context.symbol, timeframe=context.timeframe)


@router.get("/chart", response_model=ChartContextResponse)
async def get_chart_context(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ChartContext).where(ChartContext.user_id == user_id))
    context = result.scalar_one_or_none()

    if context is None:
        # No selection yet -- return sensible defaults rather than a 404.
        # A brand-new user opening the dashboard for the first time should
        # see SOMETHING (BTCUSDT/15m) rather than an error screen.
        return ChartContextResponse(symbol="BTCUSDT", timeframe="15m")

    return ChartContextResponse(symbol=context.symbol, timeframe=context.timeframe)