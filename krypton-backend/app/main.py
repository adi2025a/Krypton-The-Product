from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  # 1. Import the CORS middleware
from app.core.config import settings
from app.routers import auth, llm_key, integration, status, chart_context, market, news, agent, risk

app = FastAPI(title=settings.APP_NAME)

# 2. Add the CORS middleware right after initializing the app instance
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],       # ⚠️ CRITICAL: This allows POST, PUT, DELETE, and OPTIONS
    allow_headers=["*"],       # Allows all custom headers
)

# Your router inclusions remain perfectly fine
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(llm_key.router, prefix="/llm-key", tags=["llm-key"])
app.include_router(integration.router, prefix="/integration", tags=["integration"])
app.include_router(status.router, prefix="/status", tags=["status"])
app.include_router(chart_context.router, prefix="/context", tags=["context"])
app.include_router(market.router, prefix="/market", tags=["market"])
app.include_router(news.router, prefix="/news", tags=["news"])
app.include_router(agent.router, prefix="/agent", tags=["agent"])
app.include_router(risk.router, prefix="/risk", tags=["risk"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.ENV}