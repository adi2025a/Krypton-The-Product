"""
Async DB engine + session factory.

We use SQLAlchemy's async engine (with asyncpg driver) because FastAPI is
async end-to-end -- using a sync driver here would block the event loop
under load.
"""

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=(settings.ENV == "development"),
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,  # so we can still read attributes after commit
    class_=AsyncSession,
)


async def get_db():
    """FastAPI dependency: yields a DB session per-request, always closed after."""
    async with AsyncSessionLocal() as session:
        yield session