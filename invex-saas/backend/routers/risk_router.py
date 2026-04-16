"""
backend/routers/risk_router.py

REST API for the voice risk profiling interview using Deepgram, Gemini, and Murf.
"""

from __future__ import annotations

import logging
import io
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from models.database import get_db
from models.db_models import RiskProfile
from services.profile_cache import get_cached_profile, cache_stats
from services.deepgram_service import transcribe_audio_bytes
from services.murf_service import generate_murf_tts
from services import orchestrator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/risk", tags=["risk profiling"])

# Simple in-memory session state for demo purposes
SESSION_STATE = {}

class ProfileResponse(BaseModel):
    exists:           bool
    user_context:     Optional[dict] = None

class NeedsRefreshResponse(BaseModel):
    needs_refresh:    bool
    days_since_update: Optional[int] = None
    profile_version:  Optional[int] = None

class TTSRequest(BaseModel):
    text: str

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/voice")
async def process_voice_pipeline(
    session_id: str = Form(...),
    audio: UploadFile = File(...),
):
    """
    Pipeline: User Audio -> Deepgram STT -> Orchestrator (Evaluator/Risk/Host) -> JSON reply.
    Frontend uses /tts to convert reply_text to audio and play it.
    """
    from fastapi.responses import JSONResponse
    try:
        # 1. Read Audio
        audio_bytes = await audio.read()

        # 2. Transcribe (STT via Deepgram)
        user_text = transcribe_audio_bytes(audio_bytes)
        if not user_text:
            return JSONResponse(content={"reply_text": "", "error": "No speech detected"})

        # 3. Load State
        if session_id not in SESSION_STATE:
            SESSION_STATE[session_id] = {}
        
        state = SESSION_STATE[session_id]
        
        # 4. Multi-agent orchestration
        reply_text, new_state = await orchestrator.run_orchestrator(user_text, state)
        
        # 5. Save updated state back to memory
        SESSION_STATE[session_id] = new_state
        
        # 6. Text to Speech (TTS via Murf)
        audio_output = generate_murf_tts(reply_text)
        if not audio_output:
            return Response(content=b"", media_type="audio/mpeg")
        
        # 7. Stream back the MP3
        return StreamingResponse(
            io.BytesIO(audio_output),
            media_type="audio/mpeg"
        )
    except Exception:
        logger.exception("Risk voice pipeline failed")
        return Response(content=b"", media_type="audio/mpeg")

@router.post("/tts")
async def generate_tts(body: TTSRequest):
    audio_output = generate_murf_tts(body.text)
    return Response(content=audio_output, media_type="audio/mpeg")

@router.get("/profile/{user_id}", response_model=ProfileResponse)
def get_user_profile(user_id: str, db: Session = Depends(get_db)):
    """
    Return the full user_context JSON for this user.
    """
    cached = get_cached_profile(user_id)
    if cached:
        return ProfileResponse(exists=True, user_context=cached)

    profile = db.query(RiskProfile).filter(RiskProfile.user_id == user_id).first()
    if not profile:
        return ProfileResponse(exists=False)

    import json
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

    from services.profile_cache import set_cached_profile
    set_cached_profile(user_id, user_context)

    return ProfileResponse(exists=True, user_context=user_context)


@router.get("/profile/{user_id}/needs_refresh", response_model=NeedsRefreshResponse)
def check_needs_refresh(user_id: str, db: Session = Depends(get_db)):
    """
    Check if user needs to complete (or redo) the risk profile interview.
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
