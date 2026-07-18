"""
LangGraph node: market_analysis_node.

Deliberately "thin" -- no LLM call here at all. It just orchestrates
two existing services (fetch candles -> compute indicators) and writes
the result into shared state for synthesis_node to read later.

Every node in this graph follows the same shape:
    async def node(state: AgentState) -> dict

...taking the full state, returning only the fields it updates. This
mirrors LangGraph's expected node signature exactly.
"""

from app.agents.state import AgentState
from app.services.market_data_service import fetch_ohlcv
from app.services.indicator_service import compute_indicators


async def market_analysis_node(state: AgentState) -> dict:
    symbol = state["symbol"]
    timeframe = state["timeframe"]

    try:
        candles = await fetch_ohlcv(symbol, timeframe, limit=200)

        if len(candles) < 50:
            # Same guard as the /market/indicators route -- indicators need
            # enough history to be meaningful. Record it as a soft error,
            # not a crash: synthesis_node can still answer using sentiment
            # (and risk, if available) even without indicators.
            return {"errors": [f"Not enough candle history for {symbol} ({timeframe}) to compute indicators"]}

        indicators = compute_indicators(candles)
        return {"indicators": indicators}

    except Exception as exc:
        # A node raising an unhandled exception would crash the whole graph
        # run -- one bad API call from Binance shouldn't take down sentiment
        # and risk analysis too. We degrade gracefully instead.
        return {"errors": [f"market_analysis_node failed: {exc}"]}