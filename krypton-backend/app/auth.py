"""
Minimal auth layer.

For a real deployment swap `USERS_DB` for a real database (Postgres, etc).
Kept intentionally simple here so the whole backend can run with
`uvicorn app.main:app` and nothing else.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.models import LoginRequest, SignupRequest, UserOut

SECRET_KEY = "krypton-dev-secret-change-me"  # move to env var in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# id -> {id, name, email, password_hash}
USERS_DB: Dict[str, dict] = {}
EMAIL_INDEX: Dict[str, str] = {}  # email -> id


def _create_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": user_id, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def signup(payload: SignupRequest) -> tuple[str, UserOut]:
    if payload.email in EMAIL_INDEX:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    USERS_DB[user_id] = {
        "id": user_id,
        "name": payload.name,
        "email": payload.email,
        "password_hash": pwd_context.hash(payload.password),
    }
    EMAIL_INDEX[payload.email] = user_id
    token = _create_token(user_id)
    return token, UserOut(id=user_id, name=payload.name, email=payload.email)


def login(payload: LoginRequest) -> tuple[str, UserOut]:
    user_id = EMAIL_INDEX.get(payload.email)
    user = USERS_DB.get(user_id) if user_id else None
    if not user or not pwd_context.verify(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = _create_token(user_id)
    return token, UserOut(id=user["id"], name=user["name"], email=user["email"])


def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> UserOut:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if token is None:
        raise credentials_exception
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = USERS_DB.get(user_id)
    if user is None:
        raise credentials_exception
    return UserOut(id=user["id"], name=user["name"], email=user["email"])
