"""
Pure, deterministic math -- no LLM involved anywhere in this file.
Given the same candles, this always returns the same numbers.

Note the small deterministic labels (e.g. "bullish"/"bearish" crossover)
below ARE included -- these are simple threshold comparisons (is EMA20
above EMA50?), not agent reasoning. The distinction: an agent WEIGHS
and SYNTHESIZES multiple signals into a judgment call; this just states
a fact about the numbers ("A is currently above B").
"""

import pandas as pd
from ta.trend import EMAIndicator, MACD
from ta.momentum import RSIIndicator
from ta.volatility import BollingerBands


def compute_indicators(candles: list[list[float]]) -> dict:
    df = pd.DataFrame(candles, columns=["timestamp", "open", "high", "low", "close", "volume"])
    close = df["close"]

    ema20 = EMAIndicator(close=close, window=20).ema_indicator()
    ema50 = EMAIndicator(close=close, window=50).ema_indicator()
    rsi = RSIIndicator(close=close, window=14).rsi()
    macd_calc = MACD(close=close, window_slow=26, window_fast=12, window_sign=9)
    bb = BollingerBands(close=close, window=20, window_dev=2)

    # .iloc[-1] = the most recent (latest closed) candle's value for each indicator
    latest_close = float(close.iloc[-1])
    latest_ema20 = float(ema20.iloc[-1])
    latest_ema50 = float(ema50.iloc[-1])
    latest_rsi = float(rsi.iloc[-1])
    latest_macd = float(macd_calc.macd().iloc[-1])
    latest_macd_signal = float(macd_calc.macd_signal().iloc[-1])
    latest_macd_hist = float(macd_calc.macd_diff().iloc[-1])
    latest_bb_upper = float(bb.bollinger_hband().iloc[-1])
    latest_bb_lower = float(bb.bollinger_lband().iloc[-1])
    latest_bb_mid = float(bb.bollinger_mavg().iloc[-1])

    return {
        "close": latest_close,
        "ema": {
            "ema20": latest_ema20,
            "ema50": latest_ema50,
            "trend": "bullish" if latest_ema20 > latest_ema50 else "bearish",
        },
        "rsi": {
            "value": latest_rsi,
            "state": (
                "overbought" if latest_rsi >= 70
                else "oversold" if latest_rsi <= 30
                else "neutral"
            ),
        },
        "macd": {
            "macd": latest_macd,
            "signal": latest_macd_signal,
            "histogram": latest_macd_hist,
            "trend": "bullish" if latest_macd > latest_macd_signal else "bearish",
        },
        "bollinger_bands": {
            "upper": latest_bb_upper,
            "middle": latest_bb_mid,
            "lower": latest_bb_lower,
            "position": (
                "above_upper" if latest_close > latest_bb_upper
                else "below_lower" if latest_close < latest_bb_lower
                else "inside"
            ),
        },
    }