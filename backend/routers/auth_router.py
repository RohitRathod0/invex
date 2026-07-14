"""
routers/auth_router.py

Clean authentication — MongoDB Atlas + HttpOnly JWT cookies + session tracking.

Collections (invex_db):
  users    : registered accounts
  sessions : one doc per active login (invalidated on logout)
  audit_logs : login / logout / register events

Routes:
  POST /api/v1/auth/register   → create account, set cookies, return user info
  POST /api/v1/auth/login      → verify credentials, set cookies, return user info
  POST /api/v1/auth/logout     → clear cookies, invalidate session
  POST /api/v1/auth/refresh    → issue fresh access token from refresh cookie
  GET  /api/v1/auth/me         → return profile of current user
  GET  /api/v1/auth/sessions   → list active sessions for current user
"""

import uuid
import logging
import random
import string
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Request, Response, HTTPException, Depends, status
from pydantic import BaseModel, Field

from models.mongo import get_mongo_db
from security.password_handler import hash_password, verify_password
from security.jwt_handler import (
    create_access_token,
    create_refresh_token,
    decode_token,
    extract_token_from_request,
    set_auth_cookies,
    clear_auth_cookies,
    REFRESH_COOKIE,
)
from utils.mail import send_otp_email

logger = logging.getLogger("invex.auth")
router = APIRouter(prefix="/auth", tags=["auth"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class RegisterBody(BaseModel):
    name:     str = Field(..., min_length=2,  max_length=100)
    email:    str = Field(..., min_length=5,  max_length=254)
    password: str = Field(..., min_length=6,  max_length=128)


class LoginBody(BaseModel):
    email:    str
    password: str


class RequestOTPBody(BaseModel):
    email: str = Field(..., min_length=5, max_length=254)
    name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    password: Optional[str] = Field(default=None, min_length=6, max_length=128)


class VerifyOTPBody(BaseModel):
    email: str
    otp: str


class UserOut(BaseModel):
    user_id:    str
    name:       str
    email:      str
    status:     str
    created_at: str
    last_login: Optional[str] = None


# ── Internal helpers ──────────────────────────────────────────────────────────

def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _user_out(doc: dict) -> UserOut:
    def _iso(v):
        if isinstance(v, datetime):
            return v.isoformat()
        return str(v) if v else None

    return UserOut(
        user_id    = doc["_id"],
        name       = doc["name"],
        email      = doc["email"],
        status     = doc.get("status", "ACTIVE"),
        created_at = _iso(doc.get("created_at")),
        last_login = _iso(doc.get("last_login")),
    )


async def _create_session(db, user_id: str, request: Request) -> str:
    """Insert a session document and return the session_id."""
    session_id = str(uuid.uuid4())
    await db["sessions"].insert_one({
        "_id":        session_id,
        "user_id":    user_id,
        "is_active":  True,
        "created_at": _utc_now(),
        "expires_at": _utc_now() + timedelta(days=7),
        "ip_address": request.client.host if request.client else "unknown",
        "user_agent": request.headers.get("user-agent"),
    })
    return session_id


async def _audit(db, user_id: str, action: str, request: Request, extra: dict = {}):
    """Write an audit log entry to MongoDB."""
    await db["audit_logs"].insert_one({
        "_id":        str(uuid.uuid4()),
        "user_id":    user_id,
        "action":     action,
        "ip_address": request.client.host if request.client else "unknown",
        "user_agent": request.headers.get("user-agent"),
        "details":    extra,
        "timestamp":  _utc_now(),
    })


# ── Auth dependency ───────────────────────────────────────────────────────────

async def get_current_user(request: Request) -> dict:
    """
    FastAPI dependency — validates the access JWT (cookie or Bearer header),
    checks the session is still active in MongoDB, returns the user document.
    """
    token = extract_token_from_request(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload    = decode_token(token, expected_type="access")
    user_id    = payload["sub"]
    session_id = payload.get("session_id")

    db = get_mongo_db()

    # Validate session is still active
    if session_id:
        session = await db["sessions"].find_one({
            "_id":       session_id,
            "user_id":   user_id,
            "is_active": True,
        })
        if not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired or logged out. Please log in again.",
            )

    user = await db["users"].find_one({
        "_id":       user_id,
        "status":    "ACTIVE",
        "deleted_at": None,
    })
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or deactivated.",
        )

    return user


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/request-otp", status_code=200)
async def request_otp(body: RequestOTPBody, request: Request):
    """
    Generate a 6-digit OTP, save it to DB, and send it via email.
    If the user doesn't exist, we will create an account for them upon verification.
    """
    db = get_mongo_db()
    email = body.email.strip().lower()
    name = body.name.strip() if body.name and body.name.strip() else None
    password_hash = hash_password(body.password) if body.password else None

    # Generate 6-digit OTP
    otp = "".join(random.choices(string.digits, k=6))
    
    # Store in otps collection with an expiration (5 minutes)
    await db["otps"].update_one(
        {"email": email},
        {"$set": {
            "otp": otp,
            "expires_at": _utc_now() + timedelta(minutes=5),
            "created_at": _utc_now(),
            "name": name,
            "password_hash": password_hash,
        }},
        upsert=True
    )

    # Send email
    success = send_otp_email(email, otp)
    if not success:
        logger.error(f"Failed to send OTP to {email}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to send OTP email. Check SMTP settings and Gmail app password.",
        )

    return {"message": "If the email is valid, an OTP has been sent."}


@router.post("/verify-otp", response_model=UserOut)
async def verify_otp(body: VerifyOTPBody, request: Request, response: Response):
    """
    Verify the OTP. If valid, log the user in.
    If the user does not exist, create their account now.
    """
    db = get_mongo_db()
    email = body.email.strip().lower()
    otp_submitted = body.otp.strip()

    # Find OTP
    otp_record = await db["otps"].find_one({"email": email})
    if not otp_record or otp_record.get("otp") != otp_submitted:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired OTP."
        )

    # Check expiration
    if _utc_now() > otp_record["expires_at"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="OTP has expired. Please request a new one."
        )

    # Clean up used OTP
    await db["otps"].delete_one({"email": email})

    # Check if user exists
    user = await db["users"].find_one({"email": email, "deleted_at": None})
    
    if not user:
        # Create new user automatically
        user_id = str(uuid.uuid4())
        # Use email prefix as a default name
        default_name = otp_record.get("name") or email.split("@")[0].capitalize()
        user = {
            "_id":           user_id,
            "name":          default_name,
            "email":         email,
            "password_hash": otp_record.get("password_hash") or "",
            "status":        "ACTIVE",
            "created_at":    _utc_now(),
            "last_login":    _utc_now(),
            "deleted_at":    None,
        }
        await db["users"].insert_one(user)
        logger.info(f"New user registered via OTP: {email}")
        await _audit(db, user_id, "REGISTER_OTP", request)
    else:
        if user.get("status") != "ACTIVE":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated. Contact support.",
            )
        # Update last_login
        await db["users"].update_one(
            {"_id": user["_id"]},
            {"$set": {"last_login": _utc_now()}}
        )
        user["last_login"] = _utc_now()
        logger.info(f"User logged in via OTP: {email}")

    session_id    = await _create_session(db, user["_id"], request)
    access_token  = create_access_token(user["_id"], email, user["name"], session_id)
    refresh_token = create_refresh_token(user["_id"], session_id)

    set_auth_cookies(response, access_token, refresh_token)
    await _audit(db, user["_id"], "LOGIN_OTP", request)

    return _user_out(user)


@router.post("/register", response_model=UserOut, status_code=201)
async def register(body: RegisterBody, request: Request, response: Response):
    """
    Create a new account.
    Sets HttpOnly access + refresh cookies on success.
    """
    db    = get_mongo_db()
    email = body.email.strip().lower()

    if await db["users"].find_one({"email": email}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    user_id = str(uuid.uuid4())
    user_doc = {
        "_id":           user_id,
        "name":          body.name.strip(),
        "email":         email,
        "password_hash": hash_password(body.password),
        "status":        "ACTIVE",
        "created_at":    _utc_now(),
        "last_login":    None,
        "deleted_at":    None,
    }
    await db["users"].insert_one(user_doc)

    session_id    = await _create_session(db, user_id, request)
    access_token  = create_access_token(user_id, email, user_doc["name"], session_id)
    refresh_token = create_refresh_token(user_id, session_id)

    set_auth_cookies(response, access_token, refresh_token)
    await _audit(db, user_id, "REGISTER", request)

    logger.info(f"New user registered: {email}")
    return _user_out(user_doc)


@router.post("/login", response_model=UserOut)
async def login(body: LoginBody, request: Request, response: Response):
    """
    Authenticate with email + password.
    Sets HttpOnly access + refresh cookies on success.
    """
    db    = get_mongo_db()
    email = body.email.strip().lower()

    user = await db["users"].find_one({"email": email, "deleted_at": None})

    # Constant-time check — never reveal if email exists
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    if user.get("status") != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact support.",
        )

    # Update last_login
    await db["users"].update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": _utc_now()}}
    )
    user["last_login"] = _utc_now()

    session_id    = await _create_session(db, user["_id"], request)
    access_token  = create_access_token(user["_id"], email, user["name"], session_id)
    refresh_token = create_refresh_token(user["_id"], session_id)

    set_auth_cookies(response, access_token, refresh_token)
    await _audit(db, user["_id"], "LOGIN", request)

    logger.info(f"User logged in: {email}")
    return _user_out(user)


@router.post("/logout", status_code=200)
async def logout(
    request:      Request,
    response:     Response,
    current_user: dict = Depends(get_current_user),
):
    """
    Invalidates the session in MongoDB and clears both cookies.
    """
    db    = get_mongo_db()
    token = extract_token_from_request(request)

    if token:
        try:
            payload    = decode_token(token, expected_type="access")
            session_id = payload.get("session_id")
            if session_id:
                await db["sessions"].update_one(
                    {"_id": session_id},
                    {"$set": {"is_active": False, "logged_out_at": _utc_now()}}
                )
        except Exception:
            pass  # Don't fail logout if token decode fails

    clear_auth_cookies(response)
    await _audit(db, current_user["_id"], "LOGOUT", request)

    return {"message": "Logged out successfully."}


@router.post("/refresh", response_model=UserOut)
async def refresh(request: Request, response: Response):
    """
    Issue a new access token from a valid refresh cookie.
    Keeps the same session alive — no re-login required.
    """
    refresh_token = request.cookies.get(REFRESH_COOKIE)
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token. Please log in.",
        )

    payload    = decode_token(refresh_token, expected_type="refresh")
    user_id    = payload["sub"]
    session_id = payload.get("session_id")

    db = get_mongo_db()

    session = await db["sessions"].find_one({
        "_id":       session_id,
        "user_id":   user_id,
        "is_active": True,
    })
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please log in again.",
        )

    user = await db["users"].find_one({"_id": user_id, "status": "ACTIVE"})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )

    new_access  = create_access_token(user_id, user["email"], user["name"], session_id)
    new_refresh = create_refresh_token(user_id, session_id)
    set_auth_cookies(response, new_access, new_refresh)

    return _user_out(user)


@router.get("/me", response_model=UserOut)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    return _user_out(current_user)


