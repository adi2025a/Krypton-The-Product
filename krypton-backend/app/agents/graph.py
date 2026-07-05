"""
Builds the Krypton multi-agent graph with LangGraph:

                  ┌────────────┐
                  │ supervisor │  (LLM router)
                  └─────┬──────┘
        ┌────────┬──────┼───────┬─────────┐
        ▼        ▼      ▼       ▼         ▼
     market   sentiment  risk  onchain  (general → skip straight to responder)
        └────────┴──────┴───────┴─────────┘
                        ▼
                  ┌────────────┐
                  │ responder  │  (final LLM synthesis, cites gathered context)
                  └─────┬──────┘
                        ▼
                       END

`run_chat(...)` drives the full graph for the chat panel.
`run_agent_task(...)` invokes a single specialist node directly for the
Agent Feed panel (MarketScanner / SentimentAgent / RiskAnalyzer / OnChainAgent
cards), independent of the chat/supervisor flow.
"""

from __future__ import annotations

import time
from typing import List, Optional

from langgraph.graph import END, StateGraph

from app.agents.nodes import (
    market_scanner_node,
    onchain_node,
    responder_node,
    risk_node,
    sentiment_node,
    supervisor_node,
)
from app.agents.state import AgentState, ChatTurn
from app.models import LLMCredentials


def _route_selector(state: AgentState) -> str:
    return state.get("route", "general")


def build_chat_graph():
    graph = StateGraph(AgentState)

    graph.add_node("supervisor", supervisor_node)
    graph.add_node("market", market_scanner_node)
    graph.add_node("sentiment", sentiment_node)
    graph.add_node("risk", risk_node)
    graph.add_node("onchain", onchain_node)
    graph.add_node("responder", responder_node)

    graph.set_entry_point("supervisor")

    graph.add_conditional_edges(
        "supervisor",
        _route_selector,
        {
            "market": "market",
            "sentiment": "sentiment",
            "risk": "risk",
            "onchain": "onchain",
            "general": "responder",
        },
    )

    for specialist in ("market", "sentiment", "risk", "onchain"):
        graph.add_edge(specialist, "responder")

    graph.add_edge("responder", END)

    return graph.compile()


_CHAT_GRAPH = build_chat_graph()

# Standalone specialist nodes, keyed by the names the frontend already uses
# for its Agent Feed cards.
_AGENT_NODE_MAP = {
    "MarketScanner": market_scanner_node,
    "SentimentAgent": sentiment_node,
    "RiskAnalyzer": risk_node,
    "OnChainAgent": onchain_node,
}
_AGENT_CONTEXT_KEY = {
    "MarketScanner": "market_context",
    "SentimentAgent": "sentiment_context",
    "RiskAnalyzer": "risk_context",
    "OnChainAgent": "onchain_context",
}
_AGENT_DEFAULT_TASK = {
    "MarketScanner": "Scan {pair} for breakout patterns and key levels",
    "SentimentAgent": "Aggregate live news sentiment — last few hours",
    "RiskAnalyzer": "Calculate portfolio exposure across open positions",
    "OnChainAgent": "Monitor whale wallet movements and exchange reserves",
}


async def run_chat(
    message: str,
    history: List[ChatTurn],
    credentials: LLMCredentials,
    pair: Optional[str] = "BTC/USDT",
) -> dict:
    initial_state: AgentState = {
        "user_message": message,
        "history": history,
        "pair": pair or "BTC/USDT",
        "credentials": credentials,
    }
    result = await _CHAT_GRAPH.ainvoke(initial_state)
    return {
        "content": result.get("final_response", "").strip(),
        "routed_agent": result.get("routed_agent"),
    }


async def run_agent_task(agent_name: str, credentials: LLMCredentials, pair: Optional[str] = "BTC/USDT") -> dict:
    node_fn = _AGENT_NODE_MAP.get(agent_name)
    if node_fn is None:
        raise ValueError(f"Unknown agent: {agent_name}")

    start = time.perf_counter()
    state: AgentState = {
        "user_message": "",
        "history": [],
        "pair": pair or "BTC/USDT",
        "credentials": credentials,
    }
    result = await node_fn(state)
    duration = time.perf_counter() - start

    context_key = _AGENT_CONTEXT_KEY[agent_name]
    return {
        "agentName": agent_name,
        "task": _AGENT_DEFAULT_TASK[agent_name].format(pair=pair or "BTC/USDT"),
        "result": result.get(context_key, ""),
        "duration": f"{duration:.1f}s",
    }
