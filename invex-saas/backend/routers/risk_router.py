"""
backend/routers/risk_router.py

REST API for the voice risk profiling interview.

Endpoints:
  POST /risk/session/start              → start interview session, get first Q
  POST /risk/session/{id}/answer        → submit audio chunk, get next Q
  GET  /risk/session/{id}/status        → dimension progress + Q count
  POST /risk/session/{id}/finish        → force-finalize interview
  GET  /risk/profile/{user_id}          → get full user_context JSON
  GET  /risk/profile/{user_id}/needs_refresh → bool + days_since_update
"""

from __future__ import annotations

import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from models.database import get_db
from models.db_models import RiskProfile
from services import risk_interview_agent as agent
from services.prosody_analyzer import analyze_audio
from services.profile_cache import get_cached_profile, cache_stats

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/risk", tags=["risk profiling"])


# ── Request / Response models ─────────────────────────────────────────────────

class StartRequest(BaseModel):
    user_id: str


class StartResponse(BaseModel):
    session_id:       str
    first_question:   Optional[str]
    current_dimension: Optional[str]
    dimension_scores: dict
    is_retake:        bool
    skip:             bool   # True = fresh profile, no interview needed
    prior_profile:    Optional[dict]
    question_count:   int


class AnswerResponse(BaseModel):
    done:              bool
    next_question:     Optional[str] = None
    current_dimension: Optional[str] = None
    dimension_scores:  dict
    question_count:    int
    conflict_flagged:  bool = False
    user_context:      Optional[dict] = None


class StatusResponse(BaseModel):
    session_id:        str
    question_count:    int
    dimension_scores:  dict
    current_question:  str
    current_dimension: str
    done:              bool
    conflicts_detected: int


class ProfileResponse(BaseModel):
    exists:           bool
    user_context:     Optional[dict] = None


class NeedsRefreshResponse(BaseModel):
    needs_refresh:    bool
    days_since_update: Optional[int] = None
    profile_version:  Optional[int] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/session/start", response_model=StartResponse)
async def start_session(
    body: StartRequest,
    db: Session = Depends(get_db),
):
    """
    Initialize a new interview session.
    - If user has a fresh profile (< 30 days), returns skip=True immediately.
    - If returning user, loads prior profile for targeted retake.
    """
    session_id = str(uuid.uuid4())
    state = agent.create_session(body.user_id, session_id, db)

    return StartResponse(
        session_id       = session_id,
        first_question   = state.get("current_question") or None,
        current_dimension = state.get("current_dimension") or None,
        dimension_scores = state["dimension_scores"],
        is_retake        = state["is_retake"],
        skip             = state["skip"],
        prior_profile    = state.get("prior_profile"),
        question_count   = state["question_count"],
    )


@router.post("/session/{session_id}/answer", response_model=AnswerResponse)
async def submit_answer(
    session_id: str,
    audio: UploadFile = File(...),
    transcript_override: Optional[str] = Form(None),   # text fallback if user types
    db: Session = Depends(get_db),
):
    """
    Submit an audio recording for one question.

    Accepts multipart/form-data:
      - audio: WebM/OGG/WAV audio file from MediaRecorder
      - transcript_override (optional): typed text instead of audio

    Returns next question or completion signal.
    """
    session = agent.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    audio_bytes = await audio.read()

    # ── Transcription ─────────────────────────────────────────────────────────
    if transcript_override and transcript_override.strip():
        transcript = transcript_override.strip()
        prosody    = {"pause_score": 0.0, "rate_score": 0.0, "variance_score": 0.0,
                      "conflict_signal": False, "note": "text_override"}
    else:
        transcript = await _transcribe(audio_bytes)
        prosody    = analyze_audio(audio_bytes, transcript, mime_type=audio.content_type or "audio/webm")

    logger.info(f"[{session_id}] Transcript: {transcript[:80]}... | Conflict: {prosody.get('conflict_signal')}")

    # ── Score & advance ───────────────────────────────────────────────────────
    try:
        result = agent.submit_answer(session_id, transcript, prosody, db)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return AnswerResponse(
        done              = result["done"],
        next_question     = result.get("next_question"),
        current_dimension = result.get("current_dimension"),
        dimension_scores  = result["dimension_scores"],
        question_count    = result["question_count"],
        conflict_flagged  = result.get("conflict_flagged", False),
        user_context      = result.get("user_context"),
    )


@router.get("/session/{session_id}/status", response_model=StatusResponse)
def get_session_status(session_id: str):
    """Return current session state — dimension confidence bars for the UI."""
    state = agent.get_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    return StatusResponse(
        session_id        = session_id,
        question_count    = state["question_count"],
        dimension_scores  = state["dimension_scores"],
        current_question  = state["current_question"],
        current_dimension = state["current_dimension"],
        done              = state["done"],
        conflicts_detected = len(state["conflicts"]),
    )


@router.post("/session/{session_id}/finish")
async def force_finish_session(session_id: str, db: Session = Depends(get_db)):
    """
    Force-finalize the interview early.
    Useful for 'skip' or emergency exit flows.
    """
    try:
        result = agent.force_finish(session_id, db)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/profile/{user_id}", response_model=ProfileResponse)
def get_user_profile(user_id: str, db: Session = Depends(get_db)):
    """
    Return the full user_context JSON for this user.
    Tries cache first, falls back to PostgreSQL.
    """
    # Cache hit (fastest path)
    cached = get_cached_profile(user_id)
    if cached:
        return ProfileResponse(exists=True, user_context=cached)

    # DB fallback
    profile = db.query(RiskProfile).filter(RiskProfile.user_id == user_id).first()
    if not profile:
        return ProfileResponse(exists=False)

    import json
    from datetime import datetime

    user_context = {
        "risk_score":            profile.risk_score,
        "risk_label":            profile.risk_label,
        "horizon_years":         profile.horizon_years,
        "loss_tolerance_pct":    profile.loss_tolerance_pct,
        "income_stability":      profile.income_stability,
        "dependents":            profile.dependents,
        "liabilities":           json.loads(profile.liabilities or "[]"),
        "excluded_sectors":      json.loads(profile.excluded_sectors or "[]"),
        "preferred_sectors":     json.loads(profile.preferred_sectors or "[]"),
        "emergency_fund_months": profile.emergency_fund_months,
        "profile_version":       profile.profile_version,
        "last_updated":          profile.last_updated.date().isoformat() if profile.last_updated else None,
        "dimension_scores":      json.loads(profile.dimension_scores or "{}"),
    }

    # Warm the cache
    from services.profile_cache import set_cached_profile
    set_cached_profile(user_id, user_context)

    return ProfileResponse(exists=True, user_context=user_context)


@router.get("/profile/{user_id}/needs_refresh", response_model=NeedsRefreshResponse)
def check_needs_refresh(user_id: str, db: Session = Depends(get_db)):
    """
    Check if user needs to complete (or redo) the risk profile interview.
    Returns needs_refresh=True if:
      - No profile exists
      - Profile is older than 30 days
    """
    from datetime import datetime

    profile = db.query(RiskProfile).filter(RiskProfile.user_id == user_id).first()

    if not profile or not profile.last_updated:
        return NeedsRefreshResponse(needs_refresh=True)

    days_old = (datetime.utcnow() - profile.last_updated).days

    return NeedsRefreshResponse(
        needs_refresh     = days_old >= 30,
        days_since_update = days_old,
        profile_version   = profile.profile_version,
    )


@router.get("/admin/cache-stats")
def get_cache_stats():
    """Debug: how many profiles are in the cache."""
    return cache_stats()


# ── Groq Whisper transcription ────────────────────────────────────────────────

async def _transcribe(audio_bytes: bytes) -> str:
    """
    Transcribe audio via Groq Whisper API.
    Falls back to empty string gracefully if API unavailable.
    """
    import os
    import httpx

    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        logger.warning("GROQ_API_KEY not set — returning empty transcript")
        return ""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {api_key}"},
                files={"file": ("audio.webm", audio_bytes, "audio/webm")},
                data={"model": "whisper-large-v3", "language": "en", "response_format": "text"},
            )
            response.raise_for_status()
            return response.text.strip()

    except httpx.HTTPStatusError as exc:
        logger.error(f"Whisper API error {exc.response.status_code}: {exc.response.text[:200]}")
        return ""
    except Exception as exc:
        logger.error(f"Transcription failed: {exc}")
        return ""
