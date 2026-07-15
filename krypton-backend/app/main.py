from fastapi import FastAPI
from app.core.config import settings
from app.routers import auth , llm_key , integration , status
from app.core.logger import setup_logger

setup_logger()

app = FastAPI(title=settings.APP_NAME)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(llm_key.router,prefix="/llm-key",tags=["llm-key"])
app.include_router(integration.router, prefix="/integration", tags=["integration"])
app.include_router(status.router, prefix="/status", tags=["status"])
 


@app.get("/health")
async def health_check():
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.ENV}