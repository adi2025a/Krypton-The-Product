"""
Pulls headlines from a curated set of reputable crypto news RSS feeds.
feedparser handles the parsing; we just normalize each entry into a
consistent shape regardless of which feed it came from (different
sites use slightly different field names/structures).
"""

import asyncio
from datetime import datetime, timezone
import feedparser

# Curated, reputable sources -- avoid low-quality/spam feeds since these
# headlines directly influence the sentiment shown to a trader.
RSS_FEEDS = {
    "CoinDesk": "https://www.coindesk.com/arc/outboundfeeds/rss/",
    "CoinTelegraph": "https://cointelegraph.com/rss",
    "Decrypt": "https://decrypt.co/feed",
    "CryptoSlate": "https://cryptoslate.com/feed/",
    "Crypto.news": "https://crypto.news/feed/",
}


def _parse_one_feed(source_name: str, url: str) -> list[dict]:
    parsed = feedparser.parse(url)
    items = []
    for entry in parsed.entries:
        title = getattr(entry, "title", "").strip()
        summary = getattr(entry, "summary", "").strip()
        link = getattr(entry, "link", "")

        # feedparser gives a time.struct_time for published dates when available
        published_at = None
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            published_at = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)

        if title:
            items.append({
                "title": title,
                "summary": summary,
                "link": link,
                "source": source_name,
                "published_at": published_at,
            })
    return items


async def fetch_all_news() -> list[dict]:
    """
    feedparser is blocking/sync (network I/O under the hood), so each feed
    is fetched in a thread via asyncio.to_thread, and all feeds run
    concurrently via asyncio.gather -- otherwise 5 feeds fetched one by
    one could take several seconds combined.
    """
    tasks = [asyncio.to_thread(_parse_one_feed, name, url) for name, url in RSS_FEEDS.items()]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    all_items = []
    for result in results:
        if isinstance(result, Exception):
            continue  # one dead feed shouldn't break the whole news section
        all_items.extend(result)
    return all_items