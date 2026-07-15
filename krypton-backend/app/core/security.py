"""
Two separate responsibilities live here, both "security":

1. Password hashing (bcrypt directly) -- one-way, so we NEVER store raw passwords.
2. JWT issuing/verification -- stateless session tokens issued after login.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
import hashlib
import uuid

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

from app.core.config import settings

# HTTPBearer (not OAuth2PasswordBearer): our /auth/login takes a JSON body,
# not an OAuth2 form (username/password fields). HTTPBearer just tells
# Swagger UI "this route needs a raw Bearer token pasted in" -- a simple
# text box in the Authorize popup, matching how we actually issue tokens.
bearer_scheme = HTTPBearer()


def _prehash(raw_password: str) -> bytes:
    """
    bcrypt has a hard 72-byte input limit and raises an error beyond that.
    We first run the password through SHA-256 (always a fixed 64-char hex
    digest, well under 72 bytes) so any password length works safely,
    without losing entropy the way naive truncation would.
    """
    return hashlib.sha256(raw_password.encode("utf-8")).hexdigest().encode("utf-8")


def hash_password(raw_password: str) -> str:
    hashed = bcrypt.hashpw(_prehash(raw_password), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(raw_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(_prehash(raw_password), hashed_password.encode("utf-8"))


def create_access_token(user_id: uuid.UUID) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[str]:
    """Returns the user_id (as str) if valid, else None."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> uuid.UUID:
    """
    FastAPI dependency: attach this to any protected route via
    `user_id: uuid.UUID = Depends(get_current_user_id)`
    """
    token = credentials.credentials  # raw JWT string, "Bearer " prefix already stripped
    user_id = decode_access_token(token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return uuid.UUID(user_id)