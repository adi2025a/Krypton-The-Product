import uuid
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.core.security import get_current_user_id
from app.models.chart_context import ChartContext
from app.schemas.news import NewsFeedResponse, NewsItem
from app.services.news_service import fetch_all_news
from app.services.news_ranking_service import rank_news_for_symbol
from app.services.sentiment_service import score_sentiment

router = APIRouter()


@router.get("/feed", response_model=NewsFeedResponse)
async def get_news_feed(
    symbol: Optional[str] = None,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    # Same pattern as /market/indicators -- default to the user's saved
    # chart context so the frontend doesn't need to pass symbol every time.
    if symbol is None:
        result = await db.execute(select(ChartContext).where(ChartContext.user_id == user_id))
        context = result.scalar_one_or_none()
        symbol = context.symbol if context else "BTCUSDT"

    all_news = await fetch_all_news()
    top_items = rank_news_for_symbol(all_news, symbol, max_results=5)

    scored_items = []
    for item in top_items:
        sentiment = score_sentiment(f"{item['title']} {item['summary']}")
        scored_items.append(NewsItem(
            title=item["title"],
            summary=item["summary"],
            link=item["link"],
            source=item["source"],
            published_at=item["published_at"].isoformat() if item["published_at"] else None,
            sentiment_label=sentiment["label"],
            sentiment_score=sentiment["score"],
        ))

    return NewsFeedResponse(symbol=symbol, items=scored_items)