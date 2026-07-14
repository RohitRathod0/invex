from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import json

from models.database import get_db
from models.db_models import RiskProfile
from routers.auth_router import get_current_user

router = APIRouter(prefix="/onboarding", tags=["onboarding"])

RISK_LABELS = {
    (0, 33): "Conservative",
    (34, 66): "Moderate",
    (67, 100): "Aggressive",
}

def compute_score(answers: dict) -> float:
    """Simple scoring: each answer has a weight 1-3. Normalize to 0-100."""
    total = sum(int(v) for v in answers.values() if str(v).isdigit())
    max_possible = len(answers) * 3
    return round((total / max_possible) * 100, 1) if max_possible else 50.0

def get_label(score: float) -> str:
    for (lo, hi), label in RISK_LABELS.items():
        if lo <= score <= hi:
            return label
    return "Moderate"

class ProfileCreate(BaseModel):
    user_id: str = "0000-user"
    answers: dict   # e.g. {"q1": "2", "q2": "3", ...}

class ProfileOut(BaseModel):
    id: str
    user_id: str
    risk_score: float
    risk_label: str
    answers: dict

    class Config:
        from_attributes = True

@router.post("/profile", response_model=ProfileOut)
def save_profile(
    body: ProfileCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    score = compute_score(body.answers)
    label = get_label(score)
    user_id = current_user["_id"]  # always from JWT; body.user_id is ignored

    existing = db.query(RiskProfile).filter(RiskProfile.user_id == user_id).first()
    if existing:
        existing.risk_score = score
        existing.risk_label = label
        existing.answers = json.dumps(body.answers)
        db.commit()
        db.refresh(existing)
        profile = existing
    else:
        profile = RiskProfile(
            user_id=user_id,
            risk_score=score,
            risk_label=label,
            answers=json.dumps(body.answers),
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return ProfileOut(
        id=profile.id,
        user_id=profile.user_id,
        risk_score=profile.risk_score,
        risk_label=profile.risk_label,
        answers=json.loads(profile.answers),
    )

@router.get("/profile/{user_id}")
def get_profile(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if user_id != current_user["_id"]:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile = db.query(RiskProfile).filter(RiskProfile.user_id == user_id).first()
    if not profile:
        return {"exists": False}
    return {
        "exists": True,
        "risk_score": profile.risk_score,
        "risk_label": profile.risk_label,
        "answers": json.loads(profile.answers),
    }
