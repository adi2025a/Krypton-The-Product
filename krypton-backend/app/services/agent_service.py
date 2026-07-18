"""
The "glue" between HTTP routes and the LangGraph agent graph.

This is where all the I/O that nodes themselves shouldn't do lives:
reading the user's chart context, fetching+decrypting their LLM key,
checking Binance connection and fetching live balances. All of THAT
happens here, ONCE, before the graph runs -- nodes only ever touch
the plain AgentState dict, never a DB session directly.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.graph import agent_graph
from app.models.chart_context import ChartContext
from app.models.integration_key import IntegrationKey
from app.core.encryption import decrypt_value
from app.services.llm_key_service import get_active_llm_credentials
from app.services.binance_service import fetch_portfolio


async def run_trading_assistant(db: AsyncSession, user_id: uuid.UUID, user_question: str | None = None) -> dict:
    # 1. Chart context -- what symbol/timeframe is the user looking at.
    context_result = await db.execute(select(ChartContext).where(ChartContext.user_id == user_id))
    context = context_result.scalar_one_or_none()
    symbol = context.symbol if context else "BTCUSDT"
    timeframe = context.timeframe if context else "15m"

    # 2. LLM credentials -- compulsory. If missing, don't even build/run
    # the graph -- fail fast with a clear message instead of spending
    # time on market/sentiment/risk gathering for a request that can't
    # produce a final answer anyway.
    llm_creds = await get_active_llm_credentials(db, user_id)
    if llm_creds is None:
        return {
            "final_response": "No active LLM key is set (or it has expired). Please add one in settings first.",
            "indicators": None,
            "news_items": None,
            "sentiment_summary": None,
            "risk_profile": None,
            "errors": ["No active/valid LLM key for this user"],
        }

    # 3. Binance -- optional. Only fetch balances if actually connected.
    binance_result = await db.execute(
        select(IntegrationKey).where(
            IntegrationKey.user_id == user_id,
            IntegrationKey.platform == "binance",
            IntegrationKey.is_active == True,  # noqa: E712
        )
    )
    binance_key = binance_result.scalar_one_or_none()

    binance_connected = False
    portfolio_balances = None
    if binance_key is not None:
        try:
            api_key = decrypt_value(binance_key.encrypted_api_key)
            api_secret = decrypt_value(binance_key.encrypted_api_secret)
            portfolio_balances = await fetch_portfolio(api_key, api_secret)
            binance_connected = True
        except Exception:
            # Binance connection exists but fetching balances failed right
            # now (e.g. Binance API hiccup) -- treat as "not connected for
            # THIS request" rather than crashing the whole assistant.
            binance_connected = False
            portfolio_balances = None

    # 4. Assemble initial state and run the graph.
    initial_state = {
        "user_id": str(user_id),
        "symbol": symbol,
        "timeframe": timeframe,
        "user_question": user_question,
        "llm_provider": llm_creds["provider"],
        "llm_model_name": llm_creds["model_name"],
        "llm_api_key": llm_creds["api_key"],
        "binance_connected": binance_connected,
        "portfolio_balances": portfolio_balances,
        "errors": [],
    }

    result = await agent_graph.ainvoke(initial_state)

    # Return everything -- the popup's indicator/sentiment/risk sections
    # AND the chat response all come from this single graph run when
    # called from the chatbot/Strategy button.
    return {
        "final_response": result.get("final_response"),
        "indicators": result.get("indicators"),
        "news_items": result.get("news_items"),
        "sentiment_summary": result.get("sentiment_summary"),
        "risk_profile": result.get("risk_profile"),
        "errors": result.get("errors", []),
    }