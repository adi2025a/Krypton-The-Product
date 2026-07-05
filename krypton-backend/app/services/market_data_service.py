"""
Real market data via Binance's public REST API (no API key required).
Falls back to a deterministic-ish synthetic series if Binance is unreachable
(e.g. sandboxed / offline environments) so the app degrades gracefully
instead of hard-failing.
"""

from __future__ import annotations

import random
import time
from typing import List

import httpx

from app.models import PricePoint

BINANCE_BASE = "https://api.binance.com/api/v3"

# Frontend pair -> Binance symbol
SYMBOL_MAP = {
    "BTC/USDT": "BTCUSDT",
    "ETH/USDT": "ETHUSDT",
    "SOL/USDT": "SOLUSDT",
    "BNB/USDT": "BNBUSDT",
    "XRP/USDT": "XRPUSDT",
    "MATIC/USDT": "MATICUSDT",
}

# Frontend timeframe -> Binance kline interval + how many candles to pull
TIMEFRAME_MAP = {
    "1m": ("1m", 60),
    "5m": ("5m", 60),
    "15m": ("15m", 60),
    "1h": ("1h", 48),
    "4h": ("4h", 48),
    "1D": ("1d", 30),
    "1W": ("1w", 26),
}

_FALLBACK_BASE_PRICE = {
    "BTC/USDT": 68120, "ETH/USDT": 3640, "SOL/USDT": 182,
    "BNB/USDT": 615, "XRP/USDT": 0.62, "MATIC/USDT": 0.95,
}


def _synthetic_series(pair: str, points: int) -> List[PricePoint]:
    price = _FALLBACK_BASE_PRICE.get(pair, 100.0)
    out: List[PricePoint] = []
    now = time.localtime()
    for i in range(points):
        noise = (random.random() - 0.47) * 0.018
        price = price * (1 + noise)
        minute = (now.tm_hour * 60 + now.tm_min - (points - i) * 15) % (24 * 60)
        out.append(PricePoint(
            time=f"{minute // 60:02d}:{minute % 60:02d}",
            price=round(price, 6),
            volume=float(random.randint(200, 1000)),
        ))
    return out


async def get_price_series(pair: str, timeframe: str) -> List[PricePoint]:
    symbol = SYMBOL_MAP.get(pair)
    interval, limit = TIMEFRAME_MAP.get(timeframe, ("1h", 48))

    if not symbol:
        return _synthetic_series(pair, limit)

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(
                f"{BINANCE_BASE}/klines",
                params={"symbol": symbol, "interval": interval, "limit": limit},
            )
            resp.raise_for_status()
            klines = resp.json()
    except (httpx.HTTPError, ValueError):
        return _synthetic_series(pair, limit)

    points: List[PricePoint] = []
    for k in klines:
        # Binance kline: [open_time, open, high, low, close, volume, close_time, ...]
        open_time_ms, _open, _high, _low, close, volume = k[0], k[1], k[2], k[3], k[4], k[5]
        t = time.localtime(open_time_ms / 1000)
        points.append(PricePoint(
            time=f"{t.tm_hour:02d}:{t.tm_min:02d}",
            price=round(float(close), 6),
            volume=round(float(volume), 2),
        ))
    return points


async def get_current_price(pair: str) -> float:
    symbol = SYMBOL_MAP.get(pair)
    if not symbol:
        return _FALLBACK_BASE_PRICE.get(pair, 100.0)
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{BINANCE_BASE}/ticker/price", params={"symbol": symbol})
            resp.raise_for_status()
            return float(resp.json()["price"])
    except (httpx.HTTPError, ValueError, KeyError):
        return _FALLBACK_BASE_PRICE.get(pair, 100.0)


async def get_24h_stats(pair: str) -> dict:
    """Returns Binance's 24hr ticker stats: priceChangePercent, volume, high, low, etc."""
    symbol = SYMBOL_MAP.get(pair)
    if not symbol:
        return {}
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{BINANCE_BASE}/ticker/24hr", params={"symbol": symbol})
            resp.raise_for_status()
            return resp.json()
    except (httpx.HTTPError, ValueError):
        return {}
