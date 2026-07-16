from typing import Optional
from pydantic import BaseModel


class NewsItem(BaseModel):
    title: str
    summary: str
    link: str
    source: str
    published_at: Optional[str] = None
    sentiment_label: str
    sentiment_score: float


class NewsFeedResponse(BaseModel):
    symbol: str
    items: list[NewsItem]