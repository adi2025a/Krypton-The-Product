"""
Ranks fetched news by relevance to the user's currently selected symbol,
then by recency, and returns only the top N (default 5).

Relevance is decided by simple keyword matching (asset name/ticker
appearing in the title/summary) -- deliberately not an LLM call, same
reasoning as everywhere else in this "always-on" layer: fast and free.
"""

from datetime import datetime, timezone

# Common name aliases for major assets -- headlines rarely say "BTCUSDT",
# they say "Bitcoin" or "BTC". Extend this as you support more coins.
ASSET_ALIASES = {
    "BTC": ["bitcoin", "btc"],
    "ETH": ["ethereum", "eth", "ether"],
    "SOL": ["solana", "sol"],
    "BNB": ["binance coin", "bnb"],
    "XRP": ["ripple", "xrp"],
    "ADA": ["cardano", "ada"],
    "DOGE": ["dogecoin", "doge"],
    "MATIC": ["polygon", "matic"],
    "DOT": ["polkadot", "dot"],
}

# Fallback terms used to fill remaining slots when a symbol has too few
# dedicated headlines -- broad market news still matters to every trader.
GENERAL_MARKET_TERMS = ["crypto market", "cryptocurrency", "regulation", "sec", "etf"]


def _extract_base_asset(symbol: str) -> str:
    """'BTCUSDT' -> 'BTC', 'ETHUSDT' -> 'ETH'"""
    symbol = symbol.upper().replace("/", "")
    for quote in ("USDT", "BUSD", "USDC", "BTC", "ETH"):
        if symbol.endswith(quote) and len(symbol) > len(quote):
            return symbol[: -len(quote)]
    return symbol


def _matches_any(text: str, terms: list[str]) -> bool:
    text_lower = text.lower()
    return any(term in text_lower for term in terms)


def _recency_key(item: dict) -> datetime:
    return item.get("published_at") or datetime.min.replace(tzinfo=timezone.utc)


def rank_news_for_symbol(news_items: list[dict], symbol: str, max_results: int = 5) -> list[dict]:
    base_asset = _extract_base_asset(symbol)
    aliases = ASSET_ALIASES.get(base_asset, [base_asset.lower()])

    symbol_specific = []
    general = []

    for item in news_items:
        combined_text = f"{item['title']} {item['summary']}"
        if _matches_any(combined_text, aliases):
            symbol_specific.append(item)
        elif _matches_any(combined_text, GENERAL_MARKET_TERMS):
            general.append(item)

    # Most relevant first: symbol-specific news, newest first.
    symbol_specific.sort(key=_recency_key, reverse=True)
    general.sort(key=_recency_key, reverse=True)

    # Fill up to max_results -- symbol-specific news always wins first,
    # general market news only fills remaining empty slots.
    combined = symbol_specific[:max_results]
    if len(combined) < max_results:
        combined.extend(general[: max_results - len(combined)])

    return combined[:max_results]