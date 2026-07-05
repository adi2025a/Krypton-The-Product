"""
Node functions for the Krypton LangGraph multi-agent graph.

Each "agent" node:
  1. gathers real (or best-effort) grounding data from a service module
  2. asks the user's chosen LLM (BYOK) to reason over that data
  3. writes a short natural-language context string back into state

The `responder` node is the final synthesis step used by the chat endpoint.
The `supervisor` node is a lightweight LLM-based router.
"""

from __future__ import annotations

import random

from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.state import AgentState
from app.services import market_data_service, news_service
from app.services.llm_factory import get_llm

# ---------------------------------------------------------------------------
# Supervisor — decides which specialist agent(s) should ground the answer
# ---------------------------------------------------------------------------

_ROUTES = ["market", "sentiment", "risk", "onchain", "general"]

SUPERVISOR_PROMPT = """You are a routing supervisor for a crypto trading assistant made of \
specialist agents. Given the user's message, choose exactly ONE label that best \
describes what kind of grounding data is needed to answer well:

- market: questions about price action, chart patterns, technical indicators, support/resistance
- sentiment: questions about news, market mood, narratives, sentiment
- risk: questions about portfolio exposure, position sizing, drawdown, risk management
- onchain: questions about whale activity, exchange reserves, on-chain flows
- general: anything else (greetings, general questions, strategy discussion not tied to live data)

Respond with ONLY the single label, nothing else."""


async def supervisor_node(state: AgentState) -> AgentState:
    llm = get_llm(state["credentials"], temperature=0)
    resp = await llm.ainvoke([
        SystemMessage(content=SUPERVISOR_PROMPT),
        HumanMessage(content=state["user_message"]),
    ])
    label = resp.content.strip().lower()
    route = next((r for r in _ROUTES if r in label), "general")
    return {**state, "route": route}


# ---------------------------------------------------------------------------
# MarketScanner — real price data + technical read from the LLM
# ---------------------------------------------------------------------------

async def market_scanner_node(state: AgentState) -> AgentState:
    pair = state.get("pair") or "BTC/USDT"
    series = await market_data_service.get_price_series(pair, "1h")
    stats = await market_data_service.get_24h_stats(pair)
    current = series[-1].price if series else None

    data_summary = (
        f"Pair: {pair}\n"
        f"Latest close: {current}\n"
        f"24h change %: {stats.get('priceChangePercent', 'n/a')}\n"
        f"24h high: {stats.get('highPrice', 'n/a')}, 24h low: {stats.get('lowPrice', 'n/a')}\n"
        f"24h volume: {stats.get('volume', 'n/a')}\n"
        f"Last {min(len(series), 12)} hourly closes: "
        f"{[p.price for p in series[-12:]]}"
    )

    llm = get_llm(state["credentials"], temperature=0.4)
    resp = await llm.ainvoke([
        SystemMessage(content=(
            "You are MarketScanner, a technical-analysis agent inside a trading platform. "
            "Given real recent price data, give a concise (2-3 sentence) read on trend, "
            "key levels, and what a breakout/breakdown would look like. Be specific with numbers. "
            "Never give direct financial advice ('you should buy') — describe conditions, not instructions."
        )),
        HumanMessage(content=data_summary),
    ])
    return {**state, "market_context": resp.content.strip()}


# ---------------------------------------------------------------------------
# SentimentAgent — real news feed + LLM aggregation
# ---------------------------------------------------------------------------

async def sentiment_node(state: AgentState) -> AgentState:
    items = await news_service.fetch_news(limit=10)
    sentiment, score = news_service.overall_sentiment(items)
    headlines = "\n".join(f"- [{i.sentiment}/{i.sentimentScore}] {i.headline} ({i.source})" for i in items[:8])

    llm = get_llm(state["credentials"], temperature=0.4)
    resp = await llm.ainvoke([
        SystemMessage(content=(
            "You are SentimentAgent, aggregating real recent crypto news headlines with "
            "pre-computed sentiment tags. Summarize the dominant narrative in 2-3 sentences, "
            "naming the biggest driver, and state the overall sentiment score out of 100."
        )),
        HumanMessage(content=f"Overall score: {score}/100 ({sentiment})\n\nHeadlines:\n{headlines}"),
    ])
    return {**state, "sentiment_context": resp.content.strip()}


# ---------------------------------------------------------------------------
# RiskAnalyzer — mock portfolio (swap for real exchange/portfolio API)
# ---------------------------------------------------------------------------

_MOCK_PORTFOLIO = {
    "BTC/USDT": 0.42, "ETH/USDT": 0.21, "SOL/USDT": 0.11,
    "BNB/USDT": 0.09, "XRP/USDT": 0.10, "MATIC/USDT": 0.07,
}


async def risk_node(state: AgentState) -> AgentState:
    pair = state.get("pair") or "BTC/USDT"
    stats = await market_data_service.get_24h_stats(pair)
    volatility = abs(float(stats.get("priceChangePercent", 2.0) or 2.0))

    exposure_summary = ", ".join(f"{k}: {v*100:.0f}%" for k, v in _MOCK_PORTFOLIO.items())

    llm = get_llm(state["credentials"], temperature=0.3)
    resp = await llm.ainvoke([
        SystemMessage(content=(
            "You are RiskAnalyzer. Given portfolio allocation percentages and the current "
            "24h volatility of the pair in focus, comment on concentration risk and estimate "
            "a rough max-drawdown range in 2 sentences. Be specific with numbers."
        )),
        HumanMessage(content=f"Allocations: {exposure_summary}\nFocus pair: {pair}, 24h volatility: {volatility:.2f}%"),
    ])
    return {**state, "risk_context": resp.content.strip()}


# ---------------------------------------------------------------------------
# OnChainAgent — simulated on-chain signal (swap for Glassnode/Nansen/Dune)
# ---------------------------------------------------------------------------

async def onchain_node(state: AgentState) -> AgentState:
    pair = state.get("pair") or "BTC/USDT"
    # Placeholder on-chain metrics until a real provider (Glassnode/Nansen/Dune) is wired in.
    reserve_change = round(random.uniform(-4.0, -0.5), 2)
    whale_tx_count = random.randint(3, 22)

    llm = get_llm(state["credentials"], temperature=0.4)
    resp = await llm.ainvoke([
        SystemMessage(content=(
            "You are OnChainAgent. Given simplified on-chain signals, comment on what they "
            "typically imply for near-term supply/demand in 2 sentences."
        )),
        HumanMessage(content=(
            f"Pair: {pair}\nExchange reserve change (7d): {reserve_change}%\n"
            f"Large whale transactions (>$1M) in last hour: {whale_tx_count}"
        )),
    ])
    return {**state, "onchain_context": resp.content.strip()}


# ---------------------------------------------------------------------------
# Responder — synthesizes final chat answer using whatever context is present
# ---------------------------------------------------------------------------

async def responder_node(state: AgentState) -> AgentState:
    context_parts = []
    for key, label in [
        ("market_context", "Market data"),
        ("sentiment_context", "News sentiment"),
        ("risk_context", "Risk analysis"),
        ("onchain_context", "On-chain signal"),
    ]:
        if state.get(key):
            context_parts.append(f"[{label}]: {state[key]}")
    context_block = "\n".join(context_parts) if context_parts else "(no live data required for this question)"

    history_messages = []
    for turn in state.get("history", [])[-6:]:
        role_cls = HumanMessage if turn["role"] == "user" else SystemMessage
        history_messages.append(role_cls(content=turn["content"]))

    llm = get_llm(state["credentials"], temperature=0.5)
    resp = await llm.ainvoke([
        SystemMessage(content=(
            "You are Krypton, an AI trading assistant embedded in a crypto trading workspace. "
            "Use the specialist agent context below (if any) to ground your answer in real data. "
            "Be concise (2-4 sentences), specific with numbers when available, and never give "
            "direct 'buy/sell now' instructions — describe conditions and let the trader decide. "
            f"\n\nSpecialist context:\n{context_block}"
        )),
        *history_messages,
        HumanMessage(content=state["user_message"]),
    ])
    return {**state, "final_response": resp.content.strip(), "routed_agent": state.get("route")}
