"""
LangGraph node: sentiment_node.

Same shape as market_analysis_node -- no LLM call, just orchestrates
three existing services (fetch RSS -> rank by symbol -> score each
headline) and additionally builds ONE aggregate summary across all 5
headlines, since that's what synthesis_node and the chatbot actually
reason over (not 5 raw headlines re-pasted into a prompt).
"""

from app.agents.state import AgentState
from app.services.news_service import fetch_all_news
from app.services.news_ranking_service import rank_news_for_symbol
from app.services.sentiment_service import score_sentiment


def _build_sentiment_summary(scored_items: list[dict]) -> dict:
    """
    Collapses N individual headline sentiments into ONE aggregate signal:
    counts per label, and an average compound score. This is deliberately
    a SEPARATE, smaller object from news_items -- synthesis_node's prompt
    should reason over "3 bullish, 1 bearish, avg score 0.24" (cheap, a
    few tokens) rather than every headline's full text again (expensive,
    and redundant since news_items is already in state if needed).
    """
    if not scored_items:
        return {"bullish_count": 0, "bearish_count": 0, "neutral_count": 0, "avg_score": 0.0, "overall_label": "neutral"}

    bullish = sum(1 for i in scored_items if i["sentiment_label"] == "bullish")
    bearish = sum(1 for i in scored_items if i["sentiment_label"] == "bearish")
    neutral = sum(1 for i in scored_items if i["sentiment_label"] == "neutral")
    avg_score = round(sum(i["sentiment_score"] for i in scored_items) / len(scored_items), 3)

    if avg_score >= 0.15:
        overall_label = "bullish"
    elif avg_score <= -0.15:
        overall_label = "bearish"
    else:
        overall_label = "neutral"

    return {
        "bullish_count": bullish,
        "bearish_count": bearish,
        "neutral_count": neutral,
        "avg_score": avg_score,
        "overall_label": overall_label,
    }


async def sentiment_node(state: AgentState) -> dict:
    symbol = state["symbol"]

    try:
        all_news = await fetch_all_news()
    except Exception as exc:
        # Every RSS feed failing is unlikely (news_service already tolerates
        # single-feed failures internally) but if it happens, degrade the
        # same way market_analysis_node does -- record it, don't crash.
        return {"errors": [f"sentiment_node: failed to fetch news: {exc}"]}

    top_items = rank_news_for_symbol(all_news, symbol, max_results=5)

    scored_items = []
    for item in top_items:
        sentiment = score_sentiment(f"{item['title']} {item['summary']}")
        scored_items.append({
            "title": item["title"],
            "summary": item["summary"],
            "link": item["link"],
            "source": item["source"],
            "published_at": item["published_at"].isoformat() if item["published_at"] else None,
            "sentiment_label": sentiment["label"],
            "sentiment_score": sentiment["score"],
        })

    summary = _build_sentiment_summary(scored_items)

    return {"news_items": scored_items, "sentiment_summary": summary}