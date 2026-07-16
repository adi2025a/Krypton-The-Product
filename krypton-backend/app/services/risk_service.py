"""
Deterministic risk scoring -- no LLM involved. Two signals combined:

1. Concentration risk: what % of the user's total portfolio value sits
   in the currently selected asset. Being 80% in one coin is inherently
   riskier than being 10% in it, regardless of what that coin is.

2. Volatility risk: how much the selected symbol's price has swung
   recently (stddev of candle returns). A stable asset carries less
   risk than one whipsawing 10% a day, independent of portfolio size.

This ONLY runs when Binance is connected -- concentration risk is
meaningless without knowing the user's actual holdings.
"""

import asyncio
import statistics

from app.services.market_data_service import fetch_ohlcv, fetch_price_in_usdt


async def compute_portfolio_value(balances: list[dict]) -> dict:
    """
    balances: [{"asset": "BTC", "free": 0.5, "locked": 0.0}, ...]
    Returns total USDT value + per-asset breakdown with % of portfolio.
    """
    unique_assets = list({b["asset"] for b in balances})
    prices = await asyncio.gather(*[fetch_price_in_usdt(a) for a in unique_assets])
    price_map = dict(zip(unique_assets, prices))

    breakdown = []
    total_value = 0.0
    for b in balances:
        qty = b["free"] + b["locked"]
        value = qty * price_map.get(b["asset"], 0.0)
        breakdown.append({"asset": b["asset"], "quantity": qty, "value_usdt": value})
        total_value += value

    for item in breakdown:
        item["pct_of_portfolio"] = (item["value_usdt"] / total_value * 100) if total_value > 0 else 0.0

    return {"total_value_usdt": total_value, "breakdown": breakdown}


async def compute_volatility(symbol: str, timeframe: str) -> dict:
    """
    Standard deviation of percentage returns across recent candles --
    a simple, well-understood volatility proxy. Higher stddev = bigger,
    more frequent price swings = harder to predict = riskier.
    """
    candles = await fetch_ohlcv(symbol, timeframe, limit=50)
    closes = [c[4] for c in candles]  # index 4 = close price

    returns = [
        (closes[i] - closes[i - 1]) / closes[i - 1] * 100
        for i in range(1, len(closes))
        if closes[i - 1] != 0
    ]
    std_dev_pct = statistics.pstdev(returns) if len(returns) > 1 else 0.0

    if std_dev_pct < 1.0:
        label = "low"
    elif std_dev_pct < 3.0:
        label = "moderate"
    else:
        label = "high"

    return {"std_dev_pct": round(std_dev_pct, 3), "label": label}


def _extract_base_asset(symbol: str) -> str:
    symbol = symbol.upper().replace("/", "")
    for quote in ("USDT", "BUSD", "USDC"):
        if symbol.endswith(quote) and len(symbol) > len(quote):
            return symbol[: -len(quote)]
    return symbol


async def compute_risk_profile(balances: list[dict], symbol: str, timeframe: str) -> dict:
    """
    Combines concentration + volatility into one overall risk score (0-100)
    and label. Weighting: concentration matters slightly more (0.6) than
    volatility (0.4) -- losing a huge chunk of your OWN money to one
    coin's bad day is a bigger practical danger than general market
    choppiness, which affects everyone equally.
    """
    portfolio = await compute_portfolio_value(balances)
    volatility = await compute_volatility(symbol, timeframe)

    base_asset = _extract_base_asset(symbol)
    concentration_pct = next(
        (item["pct_of_portfolio"] for item in portfolio["breakdown"] if item["asset"] == base_asset),
        0.0,
    )

    concentration_score = min(concentration_pct, 100.0)
    volatility_score = min(volatility["std_dev_pct"] * 20, 100.0)  # scale stddev% into a 0-100 range

    overall_score = round(concentration_score * 0.6 + volatility_score * 0.4, 1)
    if overall_score < 33:
        overall_label = "low"
    elif overall_score < 66:
        overall_label = "moderate"
    else:
        overall_label = "high"

    return {
        "symbol": symbol,
        "concentration": {
            "asset": base_asset,
            "pct_of_portfolio": round(concentration_pct, 2),
        },
        "volatility": volatility,
        "portfolio_total_usdt": round(portfolio["total_value_usdt"], 2),
        "overall_risk_score": overall_score,
        "overall_risk_label": overall_label,
    }