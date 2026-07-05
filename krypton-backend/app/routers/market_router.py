from fastapi import APIRouter, HTTPException

from app.models import PriceSeriesResponse
from app.services import market_data_service

router = APIRouter(prefix="/api/market", tags=["market"])

VALID_PAIRS = list(market_data_service.SYMBOL_MAP.keys())
VALID_TIMEFRAMES = list(market_data_service.TIMEFRAME_MAP.keys())


@router.get("/pairs")
async def list_pairs():
    return {"pairs": VALID_PAIRS, "timeframes": VALID_TIMEFRAMES}


@router.get("/prices", response_model=PriceSeriesResponse)
async def get_prices(pair: str = "BTC/USDT", timeframe: str = "1h"):
    if pair not in VALID_PAIRS:
        raise HTTPException(status_code=400, detail=f"Unknown pair '{pair}'")
    if timeframe not in VALID_TIMEFRAMES:
        raise HTTPException(status_code=400, detail=f"Unknown timeframe '{timeframe}'")

    points = await market_data_service.get_price_series(pair, timeframe)
    if not points:
        raise HTTPException(status_code=502, detail="No price data available")

    current = points[-1].price
    start = points[0].price
    change_pct = round(((current - start) / start) * 100, 2) if start else 0.0

    return PriceSeriesResponse(
        pair=pair, timeframe=timeframe, points=points,
        current_price=current, change_pct=change_pct,
    )
