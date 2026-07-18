"""
LangGraph node: synthesis_node.

This is the ONLY node in the entire graph that calls an LLM. Every other
node (market_analysis, sentiment, risk) just gathers deterministic data.
This node's whole job is to take whatever data actually got populated
(some fields may be None -- risk_profile if Binance isn't connected,
indicators if Binance's candle API had an outage) and turn it into one
coherent, natural-language answer.

Two trigger modes, both handled by the same node:
1. Chatbot mode: state["user_question"] is set -- answer that specific
   question using the gathered context.
2. Strategy-button mode: state["user_question"] is None -- produce a
   general "here's the current picture" synthesis instead.
"""

from app.agents.state import AgentState
from app.services.llm_client_service import call_llm


def _build_prompt(state: AgentState) -> list[dict]:
    symbol = state["symbol"]
    timeframe = state["timeframe"]
    indicators = state.get("indicators")
    sentiment_summary = state.get("sentiment_summary")
    risk_profile = state.get("risk_profile")
    errors = state.get("errors") or []

    context_lines = [f"Symbol: {symbol}", f"Timeframe: {timeframe}"]

    if indicators:
        context_lines.append(
            "Technical indicators:\n"
            f"- EMA: 20={indicators['ema']['ema20']:.2f}, 50={indicators['ema']['ema50']:.2f} "
            f"({indicators['ema']['trend']} crossover)\n"
            f"- RSI: {indicators['rsi']['value']:.1f} ({indicators['rsi']['state']})\n"
            f"- MACD: {indicators['macd']['trend']} (histogram={indicators['macd']['histogram']:.4f})\n"
            f"- Bollinger Bands: price is {indicators['bollinger_bands']['position']}"
        )
    else:
        context_lines.append("Technical indicators: unavailable right now.")

    if sentiment_summary:
        context_lines.append(
            f"News sentiment: {sentiment_summary['overall_label']} "
            f"(avg score {sentiment_summary['avg_score']}, "
            f"{sentiment_summary['bullish_count']} bullish / "
            f"{sentiment_summary['bearish_count']} bearish / "
            f"{sentiment_summary['neutral_count']} neutral headlines)"
        )
    else:
        context_lines.append("News sentiment: unavailable right now.")

    if risk_profile:
        context_lines.append(
            f"Portfolio risk: {risk_profile['overall_risk_label']} "
            f"(score {risk_profile['overall_risk_score']}/100) -- "
            f"{risk_profile['concentration']['pct_of_portfolio']:.1f}% of portfolio in "
            f"{risk_profile['concentration']['asset']}, "
            f"volatility is {risk_profile['volatility']['label']}"
        )
    else:
        # Genuinely important the model knows WHY this is missing -- so it
        # doesn't guess or apologize oddly; it should just factually note
        # that portfolio risk isn't available without a Binance connection.
        context_lines.append("Portfolio risk: not available (user has not connected Binance).")

    if errors:
        context_lines.append(f"Note: some data sources had issues: {'; '.join(errors)}")

    context_block = "\n\n".join(context_lines)

    system_prompt = (
        "You are a crypto trading assistant. You are given technical indicators, "
        "news sentiment, and (optionally) portfolio risk data for one symbol. "
        "Synthesize this into a clear, actionable read for a trader. Be direct and "
        "concise -- a few sentences, not a report. Never fabricate data that wasn't "
        "provided; if something is marked unavailable, just work with what you have. "
        "This is not financial advice and you should not tell the user to buy or sell "
        "with certainty -- describe what the data suggests and note the uncertainty."
    )

    user_question = state.get("user_question")
    if user_question:
        user_prompt = f"Here is the current market context:\n\n{context_block}\n\nUser's question: {user_question}"
    else:
        user_prompt = f"Here is the current market context:\n\n{context_block}\n\nGive an overall strategic read on this symbol right now."

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


async def synthesis_node(state: AgentState) -> dict:
    api_key = state.get("llm_api_key")
    if not api_key:
        # Should rarely happen -- the route calling this graph should
        # check llm_key_set BEFORE invoking it at all -- but a node should
        # never assume an upstream check always ran correctly.
        return {"final_response": "No active LLM key is set. Please add one in settings to use the assistant."}

    messages = _build_prompt(state)

    try:
        response_text = await call_llm(
            provider=state["llm_provider"],
            model_name=state["llm_model_name"],
            api_key=api_key,
            messages=messages,
        )
        return {"final_response": response_text}
    except Exception as exc:
        return {
            "final_response": "The assistant couldn't generate a response right now -- your LLM provider may be unreachable or the key may have stopped working.",
            "errors": [f"synthesis_node: LLM call failed: {exc}"],
        }