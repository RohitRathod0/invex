"""
backend/routers/risk_router.py

REST API for risk profiling — save/update, profile retrieval, refresh checks,
text-based interview, and JSON download.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Optional, Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from models.database import get_db
from models.db_models import RiskProfile, RiskProfileHistory
from routers.auth_router import get_current_user
from services.profile_cache import get_cached_profile, set_cached_profile, invalidate_profile

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/risk", tags=["risk profiling"])

# ── Request / Response models ──────────────────────────────────────────────────

class ProfileResponse(BaseModel):
    exists:           bool
    user_context:     Optional[dict] = None

class NeedsRefreshResponse(BaseModel):
    needs_refresh:     bool
    days_since_update: Optional[int] = None
    profile_version:   Optional[int] = None

class SaveProfileRequest(BaseModel):
    """Payload sent by VoiceInterview when the interview completes."""
    risk_score:            float
    risk_label:            str                          # conservative / moderate / aggressive
    answers:               Dict[str, Any]               # raw Q&A dict
    horizon_years:         Optional[int]   = None
    loss_tolerance_pct:    Optional[float] = None
    income_stability:      Optional[str]   = None       # salaried_stable / freelance / business
    dependents:            Optional[int]   = None
    liabilities:           Optional[list]  = None
    excluded_sectors:      Optional[list]  = None
    preferred_sectors:     Optional[list]  = None
    emergency_fund_months: Optional[float] = None
    dimension_scores:      Optional[dict]  = None

class InterviewTurnRequest(BaseModel):
    """Single turn of the text-based risk interview."""
    user_text:  str
    session_id: str
    state:      Dict[str, Any] = {}



@router.get("/profile/{user_id}/needs_refresh", response_model=NeedsRefreshResponse)
def check_needs_refresh(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Check if user needs to complete (or redo) the risk profile interview."""
    if user_id != current_user["_id"]:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile = db.query(RiskProfile).filter(RiskProfile.user_id == user_id).first()
    if not profile or not profile.last_updated:
        return NeedsRefreshResponse(needs_refresh=True)
    days_old = (datetime.utcnow() - profile.last_updated).days
    return NeedsRefreshResponse(
        needs_refresh     = days_old >= 30,
        days_since_update = days_old,
        profile_version   = profile.profile_version,
    )


# ── POST: Save / upsert risk profile after interview ──────────────────────────

@router.post("/profile/{user_id}")
def save_profile(
    user_id: str,
    body: SaveProfileRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Called by VoiceInterview when the interview completes.
    Upserts the RiskProfile row, archives to history, and updates the cache.
    """
    if user_id != current_user["_id"]:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile = db.query(RiskProfile).filter(RiskProfile.user_id == user_id).first()

    new_version = (profile.profile_version or 0) + 1 if profile else 1

    # Archive current profile before overwriting (for retake diffs)
    if profile:
        history_snapshot = {
            "risk_score":    profile.risk_score,
            "risk_label":    profile.risk_label,
            "horizon_years": profile.horizon_years,
        }
        history = RiskProfileHistory(
            user_id         = user_id,
            profile_version = profile.profile_version,
            risk_score      = profile.risk_score,
            risk_label      = profile.risk_label,
            dimension_scores = profile.dimension_scores or "{}",
            user_context    = json.dumps(history_snapshot),
        )
        db.add(history)

    if not profile:
        profile = RiskProfile(user_id=user_id)
        db.add(profile)

    profile.risk_score            = body.risk_score
    profile.risk_label            = body.risk_label
    profile.answers               = json.dumps(body.answers)
    profile.horizon_years         = body.horizon_years
    profile.loss_tolerance_pct    = body.loss_tolerance_pct
    profile.income_stability      = body.income_stability
    profile.dependents            = body.dependents
    profile.liabilities           = json.dumps(body.liabilities or [])
    profile.excluded_sectors      = json.dumps(body.excluded_sectors or [])
    profile.preferred_sectors     = json.dumps(body.preferred_sectors or [])
    profile.emergency_fund_months = body.emergency_fund_months
    profile.dimension_scores      = json.dumps(body.dimension_scores or {})
    profile.profile_version       = new_version
    profile.last_updated          = datetime.utcnow()

    db.commit()
    db.refresh(profile)

    # Build user_context and warm the cache
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
        "last_updated":          profile.last_updated.date().isoformat(),
        "dimension_scores":      json.loads(profile.dimension_scores or "{}"),
    }
    invalidate_profile(user_id)
    set_cached_profile(user_id, user_context)

    logger.info(f"Risk profile saved for user {user_id} (v{new_version})")
    return {"status": "saved", "user_id": user_id, "profile_version": new_version, "user_context": user_context}


# ── GET: Download risk profile as JSON ────────────────────────────────────────

@router.get("/profile/{user_id}/download")
def download_profile(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Return the full risk profile as a downloadable JSON file."""
    if user_id != current_user["_id"]:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile = db.query(RiskProfile).filter(RiskProfile.user_id == user_id).first()
    if not profile:
        return JSONResponse(status_code=404, content={"detail": "No risk profile found"})

    export = {
        "user_id":               user_id,
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
        "dimension_scores":      json.loads(profile.dimension_scores or "{}"),
        "profile_version":       profile.profile_version,
        "last_updated":          profile.last_updated.isoformat() if profile.last_updated else None,
        "answers":               json.loads(profile.answers or "{}"),
        "exported_at":           datetime.utcnow().isoformat(),
    }
    return JSONResponse(
        content=export,
        headers={"Content-Disposition": f"attachment; filename=risk_profile_{user_id}.json"},
    )


# ── POST: Single interview turn (text-in / text-out) ──────────────────────────

@router.post("/interview/turn")
async def interview_turn(body: InterviewTurnRequest):
    """
    One turn of the risk interview via text.
    Frontend sends user_text + state, receives {reply, state, is_complete, profile}.
    Used by VoiceInterview with browser SpeechRecognition / SpeechSynthesis.
    """
    from services.orchestrator import run_orchestrator, build_profile_from_state
    try:
        reply, new_state, is_complete, profile = await run_orchestrator(
            body.user_text, body.state, extract_profile=True
        )
        return {
            "reply":       reply,
            "state":       new_state,
            "is_complete": is_complete,
            "profile":     profile,     # non-null only when is_complete=True
        }
    except Exception as exc:
        logger.exception("Interview turn failed")
        return {"reply": "I'm having trouble right now. Could you try again?", "state": body.state, "is_complete": False, "profile": None}


# ── GET: Full profile (existing) ──────────────────────────────────────────────

@router.get("/profile/{user_id}", response_model=ProfileResponse)
def get_user_profile(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Return the full user_context JSON for this user."""
    if user_id != current_user["_id"]:
        raise HTTPException(status_code=404, detail="Profile not found")
    cached = get_cached_profile(user_id)
    if cached:
        return ProfileResponse(exists=True, user_context=cached)

    profile = db.query(RiskProfile).filter(RiskProfile.user_id == user_id).first()
    if not profile:
        return ProfileResponse(exists=False)

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

    from utils.context_compressor import set_user_context
    set_cached_profile(user_id, user_context)
    set_user_context(user_id, user_context)

    return ProfileResponse(exists=True, user_context=user_context)

