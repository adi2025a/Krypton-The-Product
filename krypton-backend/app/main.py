from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import agents_router, auth_router, chat_router, market_router, news_router

app = FastAPI(title="Krypton API", version="1.0.0")

# In production, restrict this to your actual frontend origin(s).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(market_router.router)
app.include_router(news_router.router)
app.include_router(chat_router.router)
app.include_router(agents_router.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
