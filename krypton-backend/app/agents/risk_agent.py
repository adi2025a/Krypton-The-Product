"""
LangGraph node: risk_node.

Unlike market_analysis_node and sentiment_node, this one is CONDITIONAL --
it only produces a real result if Binance is connected. Concentration
risk is meaningless without knowing the user's actual holdings, so
there's no sensible fallback here the way there is for market/sentiment
data (which are always public and always available).

Two layers of defense against this running without data:
1. The GRAPH itself should route around this node entirely when
   binance_connected is False (a conditional edge in graph.py) -- so in
   the normal case, this function's body barely runs at all.
2. This function ALSO checks binance_connected/portfolio_balances itself
   and no-ops if either is missing. Defense in depth: if graph.py's
   routing ever has a bug, this node still won't crash or fabricate a
   risk score from no data.
"""

from app.agents.state import AgentState
from app.services.risk_service import compute_risk_profile


async def risk_node(state: AgentState) -> dict:
    if not state.get("binance_connected"):
        return {}  # no-op: risk_profile stays whatever it already was (None)

    balances = state.get("portfolio_balances")
    if not balances:
        return {"errors": ["risk_node: Binance marked connected but no portfolio balances were provided"]}

    try:
        risk_profile = await compute_risk_profile(
            balances=balances,
            symbol=state["symbol"],
            timeframe=state["timeframe"],
        )
        return {"risk_profile": risk_profile}
    except Exception as exc:
        return {"errors": [f"risk_node failed: {exc}"]}