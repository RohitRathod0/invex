"""
security/jwt_handler.py

Creates and validates JWTs for session-based auth.
Payload: { sub: user_id, session_id, email, name, exp }
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional

from jose import jwt, JWTError
from fastapi import HTTPException, Request, status
from config import get_settings

settings    = get_settings()
ALGORITHM   = "HS256"
TOKEN_TTL_H = 8       # access token lives 8 hours
REFRESH_TTL_D = 7     # refresh token lives 7 days

# ── Cookie names ──────────────────────────────────────────────────────────────
ACCESS_COOKIE  = "invex_access"
REFRESH_COOKIE = "invex_refresh"


def _secret() -> str:
    return settings.JWT_SECRET


# ── Token creation ────────────────────────────────────────────────────────────

def create_access_token(user_id: str, email: str, name: str, session_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=TOKEN_TTL_H)
    payload = {
        "sub":        user_id,
        "session_id": session_id,
        "email":      email,
        "name":       name,
        "type":       "access",
        "exp":        expire,
    }
    return jwt.encode(payload, _secret(), algorithm=ALGORITHM)


def create_refresh_token(user_id: str, session_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TTL_D)
    payload = {
        "sub":        user_id,
        "session_id": session_id,
        "type":       "refresh",
        "exp":        expire,
    }
    return jwt.encode(payload, _secret(), algorithm=ALGORITHM)


# ── Token validation ──────────────────────────────────────────────────────────

def decode_token(token: str, expected_type: str = "access") -> Dict[str, Any]:
    """Decode and validate a JWT. Raises 401 on any failure."""
    try:
        payload = jwt.decode(token, _secret(), algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or expired",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("type") != expected_type:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Expected {expected_type} token",
        )
    if not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject",
        )
    return payload


def extract_token_from_request(request: Request) -> Optional[str]:
    """
    Token lookup order:
      1. HttpOnly cookie  `invex_access`
      2. Authorization header  `Bearer <token>`
    """
    token = request.cookies.get(ACCESS_COOKIE)
    if token:
        return token

    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth.split(" ", 1)[1]

    return None


# ── Cookie helpers ────────────────────────────────────────────────────────────

COOKIE_KWARGS = dict(
    httponly=True,
    samesite="lax",
    secure=False,   # set True in production (HTTPS)
    path="/",
)

def set_auth_cookies(response, access_token: str, refresh_token: str):
    """Attach both JWTs as HttpOnly cookies on the response."""
    response.set_cookie(
        key=ACCESS_COOKIE,
        value=access_token,
        max_age=TOKEN_TTL_H * 3600,
        **COOKIE_KWARGS,
    )
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=refresh_token,
        max_age=REFRESH_TTL_D * 86400,
        **COOKIE_KWARGS,
    )


def clear_auth_cookies(response):
    """Wipe both cookies on logout."""
    response.delete_cookie(ACCESS_COOKIE, path="/")
    response.delete_cookie(REFRESH_COOKIE, path="/")


def get_user_id_from_auth_header(auth_header: Optional[str]) -> Optional[str]:
    """
    Soft decode for middleware — never raises, returns None on any failure.
    Checks Authorization Bearer header only (cookies not available in middleware context).
    """
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, _secret(), algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None
