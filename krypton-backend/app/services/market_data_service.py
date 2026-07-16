"""
Fetches raw candle (OHLCV) data from Binance via CCXT.

Important: this is PUBLIC market data -- no API key needed at all.
That's deliberate: charting/indicators should work for every logged-in
user regardless of whether they've connected their own Binance account.
Binance keys are only needed later, for the user's personal PORTFOLIO
(services/binance_service.py), which is a completely separate concern.
"""

import ccxt.async_support as ccxt_async


def _to_ccxt_symbol(symbol: str) -> str:
    """
    Our chart_context stores symbols as 'BTCUSDT' (no separator), matching
    Binance's raw REST format. CCXT's unified API expects 'BTC/USDT' --
    so we convert only at this boundary, keeping the rest of the app
    consistent with the Binance-style format.
    """
    if "/" in symbol:
        return symbol
    # crude but effective for the common quote assets we care about
    for quote in ("USDT", "BUSD", "USDC", "BTC", "ETH"):
        if symbol.endswith(quote) and len(symbol) > len(quote):
            return f"{symbol[:-len(quote)]}/{quote}"
    return symbol


async def fetch_ohlcv(symbol: str, timeframe: str, limit: int = 200) -> list[list[float]]:
    """
    Returns a list of [timestamp_ms, open, high, low, close, volume].
    `limit` = how many past candles to pull -- 200 gives enough history
    for indicators like EMA-50 or Bollinger-20 to be accurate (they need
    a warm-up window; too few candles makes early values unreliable).
    """
    exchange = ccxt_async.binance()
    try:
        ccxt_symbol = _to_ccxt_symbol(symbol)
        candles = await exchange.fetch_ohlcv(ccxt_symbol, timeframe=timeframe, limit=limit)
        return candles
    finally:
        await exchange.close()  # always release the underlying aiohttp session