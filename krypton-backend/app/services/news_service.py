"""
Real crypto news via public RSS feeds (CoinDesk, Cointelegraph, Decrypt — no
API key required). A lightweight keyword heuristic provides an instant
sentiment score; if the caller supplies LLM credentials, `score_with_llm`
in agents/sentiment_agent.py can refine/replace the score.
"""

from __future__ import annotations

import hashlib
import time
from typing import List

import feedparser
import httpx

from app.models import NewsItem

FEEDS = [
    ("CoinDesk", "https://www.coindesk.com/arc/outboundfeeds/rss/"),
    ("Cointelegraph", "https://cointelegraph.com/rss"),
    ("Decrypt", "https://decrypt.co/feed"),
]

_BULLISH_WORDS = [
    "surge", "rally", "gain", "soar", "bullish", "inflow", "adoption", "record high",
    "breakout", "upgrade", "approval", "growth", "partnership", "buy", "accumulation",
]
_BEARISH_WORDS = [
    "crash", "plunge", "bearish", "hack", "exploit", "lawsuit", "regulatory", "ban",
    "outflow", "sell-off", "selloff", "decline", "fraud", "investigation", "liquidation",
]


def _heuristic_sentiment(text: str) -> tuple[str, int]:
    lower = text.lower()
    bull = sum(1 for w in _BULLISH_WORDS if w in lower)
    bear = sum(1 for w in _BEARISH_WORDS if w in lower)
    score = 50 + (bull - bear) * 12
    score = max(5, min(95, score))
    if score >= 60:
        return "bullish", score
    if score <= 40:
        return "bearish", score
    return "neutral", score


def _relative_time(struct_time) -> str:
    if not struct_time:
        return "recently"
    published = time.mktime(struct_time)
    delta_min = max(0, int((time.time() - published) / 60))
    if delta_min < 1:
        return "just now"
    if delta_min < 60:
        return f"{delta_min}m ago"
    hours = delta_min // 60
    if hours < 24:
        return f"{hours}h ago"
    return f"{hours // 24}d ago"


async def fetch_news(limit: int = 12) -> List[NewsItem]:
    items: List[NewsItem] = []
    async with httpx.AsyncClient(timeout=6.0, headers={"User-Agent": "Krypton/1.0"}) as client:
        for source, url in FEEDS:
            try:
                resp = await client.get(url)
                resp.raise_for_status()
                parsed = feedparser.parse(resp.content)
            except (httpx.HTTPError, Exception):
                continue

            for entry in parsed.entries[:6]:
                headline = getattr(entry, "title", "").strip()
                summary_raw = getattr(entry, "summary", "") or getattr(entry, "description", "")
                summary = summary_raw.replace("\n", " ").strip()
                if len(summary) > 280:
                    summary = summary[:277] + "..."
                sentiment, score = _heuristic_sentiment(f"{headline} {summary}")
                uid = hashlib.sha1((headline + source).encode()).hexdigest()[:12]
                items.append(NewsItem(
                    id=uid,
                    headline=headline or "(untitled)",
                    source=source,
                    time=_relative_time(getattr(entry, "published_parsed", None)),
                    url=getattr(entry, "link", None),
                    summary=summary or "No summary available.",
                    sentiment=sentiment,
                    sentimentScore=score,
                ))

    # newest-first is roughly feed order already; just cap to `limit`
    return items[:limit]


def overall_sentiment(items: List[NewsItem]) -> tuple[str, int]:
    if not items:
        return "neutral", 50
    avg = round(sum(i.sentimentScore for i in items) / len(items))
    if avg >= 60:
        return "bullish", avg
    if avg <= 40:
        return "bearish", avg
    return "neutral", avg
