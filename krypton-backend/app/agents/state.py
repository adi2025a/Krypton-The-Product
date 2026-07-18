"""
Shared state passed through every node in the LangGraph agent graph.

Think of this as a whiteboard: each node reads what it needs off it and
writes back only the field(s) it's responsible for. LangGraph merges
each node's partial return into this overall state automatically -- a
node returning {"indicators": {...}} does NOT wipe out `news_items` or
anything else already on the board.

Fields start as None and get filled in as the graph executes. By the
time `synthesis_node` runs, it reads whichever fields are populated
(risk_profile may legitimately still be None if Binance isn't connected)
and builds the final answer from whatever's actually available.
"""

from typing import TypedDict, Optional, Annotated
import operator


class AgentState(TypedDict):
    # --- set once, at graph entry, never changed by other nodes ---
    user_id: str
    symbol: str
    timeframe: str
    binance_connected: bool

    # --- LLM credentials for the synthesis node (fetched once at entry,
    #     so we don't hit the DB/decrypt repeatedly inside the graph) ---
    llm_provider: Optional[str]
    llm_model_name: Optional[str]
    llm_api_key: Optional[str]

    # --- filled in by market_analysis_node ---
    indicators: Optional[dict]

    # --- filled in by sentiment_node ---
    news_items: Optional[list[dict]]
    sentiment_summary: Optional[dict]  # aggregate bullish/bearish/neutral counts + avg score

    # --- filled in ONCE at graph entry, same pattern as llm_api_key:
    #     fetched+decrypted before the graph runs, so risk_node never
    #     needs a DB session or decryption logic of its own. Stays None
    #     if binance_connected is False. ---
    portfolio_balances: Optional[list[dict]]

    # --- filled in by risk_node (stays None if binance_connected is False) ---
    risk_profile: Optional[dict]

    # --- filled in LAST, by synthesis_node ---
    final_response: Optional[str]

    # --- populated by ANY node if something goes wrong. `Annotated[..., operator.add]`
    #     tells LangGraph to CONCATENATE each node's returned list onto the
    #     existing one, instead of its default behavior of overwriting the
    #     field outright. Without this, if two nodes fail independently,
    #     the second one's error would silently erase the first one's. ---
    errors: Annotated[list[str], operator.add]