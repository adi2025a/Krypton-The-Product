from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.db import get_db
from app import auth
from app.models import SignupRequest, LoginRequest

router = APIRouter()

@router.post("/api/auth/signup")
async def signup_route(payload: SignupRequest, db: AsyncSession = Depends(get_db)):
    token, user = await auth.signup(payload, db)
    return {"access_token": token, "user": user}

@router.post("/api/auth/login")
async def login_route(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    token, user = await auth.login(payload, db)
    return {"access_token": token, "user": user}