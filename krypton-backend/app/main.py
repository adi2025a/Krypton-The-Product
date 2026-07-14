from fastapi import FastAPI
from app.core.config import settings
from app.routers import auth
from app.core.logger import setup_logger

setup_logger()

app = FastAPI(title=settings.APP_NAME)

app.include_router(auth.router, prefix="/auth", tags=["auth"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.ENV}