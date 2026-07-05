from fastapi import APIRouter

from app.models import NewsListResponse
from app.services import news_service

router = APIRouter(prefix="/api/news", tags=["news"])


@router.get("", response_model=NewsListResponse)
async def get_news(limit: int = 12):
    items = await news_service.fetch_news(limit=limit)
    sentiment, score = news_service.overall_sentiment(items)
    return NewsListResponse(items=items, overall_sentiment=sentiment, overall_score=score)
