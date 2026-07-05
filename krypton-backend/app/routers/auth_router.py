from fastapi import APIRouter

from app import auth
from app.models import LoginRequest, SignupRequest, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse)
def signup(payload: SignupRequest):
    token, user = auth.signup(payload)
    return TokenResponse(access_token=token, user=user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    token, user = auth.login(payload)
    return TokenResponse(access_token=token, user=user)
