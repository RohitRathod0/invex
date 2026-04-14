"""
backend/services/risk_interview_agent.py

LangGraph-based adaptive risk profiling interview agent.

Nodes:
  load_profile       → check if profile exists & fresh (< 30 days)
  select_next_question → pick lowest-confidence dimension, generate contextual Q
  score_answer       → transcript + prosody → update dimension confidence
  check_coverage     → all dims ≥ 80%? conflict? → route to next node
  conflict_question  → generate conflict-resolution Q
  build_profile      → aggregate → user_context JSON → save to DB + cache

6 Dimensions:
  loss_tolerance | horizon | income_stability | dependents | sectors | return_risk
"""

from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Optional, TypedDict

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────
DIMENSIONS = [
    "loss_tolerance",
    "horizon",
    "income_stability",
    "dependents",
    "sectors",
    "return_risk",
]

CONFIDENCE_THRESHOLD = 80.0   # Must reach this per dimension to finish
MIN_QUESTIONS        = 7
MAX_QUESTIONS        = 15
PROFILE_STALE_DAYS   = 30     # Retake required after this many days

TRANSCRIPT_DIR = Path("outputs/transcripts")

# ── Dimension question seeds ───────────────────────────────────────────────────
DIMENSION_SEEDS: dict[str, list[str]] = {
    "loss_tolerance": [
        "If your portfolio dropped 20% in a single month, walk me through what you'd actually do.",
        "What's the maximum percentage loss in a year you could absorb without losing sleep?",
        "Have you ever seen your investments go down significantly? How did you respond?",
    ],
    "horizon": [
        "How many years can this money stay untouched — what's your earliest you'd need to access it?",
        "Are you investing towards a specific goal — like retirement, a home purchase, or a child's education? When is that goal?",
        "If markets crashed tomorrow and took 3 years to recover, would that be okay?",
    ],
    "income_stability": [
        "Tell me about your income — are you salaried, freelancing, running a business, or something else?",
        "How predictable is your monthly income — do you know roughly what you'll earn 6 months from now?",
        "If you lost your primary income source, how many months could you sustain your current lifestyle?",
    ],
    "dependents": [
        "Do you have dependents — children, parents, a spouse who relies on your income?",
        "Are you servicing any major liabilities right now — a home loan, car loan, or personal loan EMIs?",
        "What does your monthly fixed-cost commitment look like — EMIs, rent, school fees?",
    ],
    "sectors": [
        "Are there any industries you'd refuse to invest in on principle — tobacco, gambling, defense, fossil fuels?",
        "Which sectors do you follow closely or feel excited about — technology, pharma, banking, infrastructure?",
        "If you had to pick 2-3 sectors for the next 5 years, which industries do you believe in?",
    ],
    "return_risk": [
        "What annual return would make you happy — and what's the minimum you'd accept before feeling disappointed?",
        "Would you take a chance at 25% returns if there was also a real chance of losing 15%?",
        "On a scale of 1-10, how comfortable are you with volatility in exchange for higher long-term returns?",
    ],
}

# ── State schema ──────────────────────────────────────────────────────────────
class InterviewState(TypedDict):
    user_id: str
    session_id: str
    question_count: int
    dimension_scores: dict[str, float]       # 0-100 confidence per dimension
    dimension_values: dict[str, Any]         # extracted values per dimension
    qa_history: list[dict]                   # [{question, transcript, prosody, dim}]
    conflicts: list[dict]                    # detected conflicts
    current_question: str                    # question currently being asked
    current_dimension: str                   # dimension being probed
    pending_conflict: Optional[dict]         # conflict awaiting resolution
    is_retake: bool
    prior_profile: Optional[dict]
    done: bool
    skip: bool                               # True if profile is fresh — no interview needed
    error: Optional[str]


# ── LLM helper ────────────────────────────────────────────────────────────────
def _get_llm():
    """Return a Groq LLM instance (fast, cheap, reliable for structured extraction)."""
    try:
        from langchain_groq import ChatGroq
        api_key = os.getenv("GROQ_API_KEY", "")
        if not api_key:
            raise ValueError("GROQ_API_KEY not set")
        return ChatGroq(model="llama-3.3-70b-versatile", temperature=0.3, api_key=api_key)
    except Exception as exc:
        logger.error(f"LLM init failed: {exc}")
        return None


# ── Node: load_profile ─────────────────────────────────────────────────────────
def load_profile(state: InterviewState, db: Session) -> InterviewState:
    """
    Check if user has a fresh (< 30 days) risk profile.
    If yes → set skip=True (no interview needed).
    If retaker → load prior answers to personalise questions.
    """
    from models.db_models import RiskProfile

    user_id = state["user_id"]
    profile = db.query(RiskProfile).filter(RiskProfile.user_id == user_id).first()

    if profile and profile.last_updated:
        days_old = (datetime.utcnow() - profile.last_updated).days
        if days_old < PROFILE_STALE_DAYS:
            logger.info(f"Profile for {user_id} is {days_old} days old — skipping interview")
            return {**state, "skip": True}

    if profile:
        # Returning user — load prior context for retake
        prior = {
            "risk_score":          profile.risk_score,
            "risk_label":          profile.risk_label,
            "horizon_years":       profile.horizon_years,
            "loss_tolerance_pct":  profile.loss_tolerance_pct,
            "income_stability":    profile.income_stability,
            "dependents":          profile.dependents,
            "liabilities":         json.loads(profile.liabilities or "[]"),
            "excluded_sectors":    json.loads(profile.excluded_sectors or "[]"),
            "preferred_sectors":   json.loads(profile.preferred_sectors or "[]"),
            "emergency_fund_months": profile.emergency_fund_months,
            "profile_version":     profile.profile_version or 1,
        }
        # Load prior dimension scores to identify borderline dims
        prior_dim_scores = json.loads(profile.dimension_scores or "{}")
        # Start with prior scores so only stale/borderline dims get re-asked
        initial_scores = {
            dim: (score if score >= 85.0 else 0.0)
            for dim, score in prior_dim_scores.items()
        }
        # Always re-ask volatile dimensions on retake
        for dim in ("income_stability", "dependents"):
            initial_scores[dim] = 0.0

        return {
            **state,
            "is_retake":       True,
            "prior_profile":   prior,
            "dimension_scores": initial_scores,
            "skip":            False,
        }

    # Brand new user
    return {
        **state,
        "is_retake":          False,
        "prior_profile":      None,
        "dimension_scores":   {dim: 0.0 for dim in DIMENSIONS},
        "skip":               False,
    }


# ── Node: select_next_question ────────────────────────────────────────────────
def select_next_question(state: InterviewState) -> InterviewState:
    """
    Pick the dimension with the lowest confidence score.
    Call LLM to generate a contextual question based on prior Q&A.
    """
    dim_scores = state["dimension_scores"]
    qa_history = state["qa_history"]

    # If there's a pending conflict, resolve it first
    if state.get("pending_conflict"):
        conflict = state["pending_conflict"]
        return {**state, "current_question": conflict["question"], "current_dimension": conflict["dimension"]}

    # Pick lowest-confidence dimension that hasn't maxed out
    incomplete = [(dim, score) for dim, score in dim_scores.items() if score < CONFIDENCE_THRESHOLD]
    if not incomplete:
        return {**state, "done": True}

    # Sort by confidence ascending — target lowest first
    incomplete.sort(key=lambda x: x[1])
    target_dim = incomplete[0][0]

    # Context-aware question generation
    question = _generate_contextual_question(target_dim, state)

    logger.info(f"[Q{state['question_count']+1}] Dimension: {target_dim} | Score: {dim_scores[target_dim]:.0f}%")
    return {**state, "current_question": question, "current_dimension": target_dim}


def _generate_contextual_question(dimension: str, state: InterviewState) -> str:
    """Use LLM to generate a context-aware question. Falls back to seed if LLM fails."""
    qa_history  = state["qa_history"]
    dim_values  = state["dimension_values"]
    prior       = state.get("prior_profile")
    question_n  = state["question_count"]

    llm = _get_llm()
    if not llm or len(qa_history) == 0:
        # First question or no LLM — use seed
        seed_idx = min(question_n, len(DIMENSION_SEEDS[dimension]) - 1)
        return DIMENSION_SEEDS[dimension][seed_idx]

    # Build context prompt
    prior_context = ""
    if prior:
        prior_context = f"\nThis is a returning user. Previously: {json.dumps(prior, default=str)}"
    if dim_values:
        prior_context += f"\nKnown facts: {json.dumps(dim_values, default=str)}"

    history_summary = "\n".join([
        f"Q: {qa['question']}\nA: {qa['transcript']}"
        for qa in qa_history[-4:]   # last 4 exchanges for brevity
    ])

    seed = DIMENSION_SEEDS[dimension][0]   # anchor question for this dimension

    prompt = f"""You are an empathetic financial advisor conducting a risk profiling interview.
Generate exactly ONE follow-up question for the dimension: {dimension}.

Previous conversation:
{history_summary}
{prior_context}

Seed question for this dimension: "{seed}"

Rules:
- Reference specific details from previous answers if available (e.g. "given your home loan...")
- Ask only one question, no preamble
- Sound conversational, not robotic
- Keep under 35 words
- Focus only on {dimension}

Return ONLY the question text."""

    try:
        response = llm.invoke(prompt)
        question = response.content.strip().strip('"')
        # Sanity check
        if len(question) > 10 and "?" in question:
            return question
    except Exception as exc:
        logger.warning(f"LLM question generation failed: {exc}")

    # Fallback
    seed_idx = min(question_n, len(DIMENSION_SEEDS[dimension]) - 1)
    return DIMENSION_SEEDS[dimension][seed_idx]


# ── Node: score_answer ─────────────────────────────────────────────────────────
def score_answer(
    state: InterviewState,
    transcript: str,
    prosody: dict,
) -> InterviewState:
    """
    Extract structured values from transcript.
    Update dimension confidence.
    Detect prosody-verbal conflicts.
    """
    dimension = state["current_dimension"]
    question  = state["current_question"]
    qa_history = list(state["qa_history"])
    dim_scores = dict(state["dimension_scores"])
    dim_values = dict(state["dimension_values"])
    conflicts  = list(state["conflicts"])

    # ── Extract structured value from transcript ───────────────────────────
    extracted, confidence_boost = _extract_dimension_value(dimension, transcript, state)

    # ── Update scores ──────────────────────────────────────────────────────
    current_score = dim_scores.get(dimension, 0.0)
    new_score = min(current_score + confidence_boost, 100.0)
    dim_scores[dimension] = new_score

    if extracted is not None:
        dim_values[dimension] = extracted

    # ── Record Q&A ─────────────────────────────────────────────────────────
    qa_entry = {
        "question":   question,
        "transcript": transcript,
        "prosody":    prosody,
        "dimension":  dimension,
        "extracted":  extracted,
        "confidence_boost": confidence_boost,
    }
    qa_history.append(qa_entry)

    # ── Conflict detection ─────────────────────────────────────────────────
    pending_conflict = state.get("pending_conflict")

    # Clear resolved conflict
    if pending_conflict and pending_conflict["dimension"] == dimension:
        pending_conflict = None
        # Re-score with conflict context
        dim_scores[dimension] = min(new_score + 15.0, 100.0)

    # Detect new conflict
    elif prosody.get("conflict_signal") and confidence_boost > 10:
        # Only flag if answer seems positive but prosody shows hesitation
        conflict = {
            "dimension":   dimension,
            "question":    question,
            "transcript":  transcript,
            "prosody":     prosody,
            "resolution_question": _generate_conflict_question(dimension, transcript, state),
        }
        conflicts.append(conflict)
        pending_conflict = {
            "dimension": dimension,
            "question":  conflict["resolution_question"],
        }
        # Reduce score slightly — not fully trusted until resolved
        dim_scores[dimension] = max(new_score - 15.0, current_score)
        logger.info(f"[CONFLICT] Detected on dimension '{dimension}': pause_score={prosody.get('pause_score')}")

    return {
        **state,
        "dimension_scores":  dim_scores,
        "dimension_values":  dim_values,
        "qa_history":        qa_history,
        "conflicts":         conflicts,
        "pending_conflict":  pending_conflict,
        "question_count":    state["question_count"] + 1,
    }


def _extract_dimension_value(
    dimension: str, transcript: str, state: InterviewState
) -> tuple[Any, float]:
    """
    Call LLM to extract a structured value from the transcript.
    Returns (extracted_value, confidence_boost_points).
    """
    llm = _get_llm()
    if not llm:
        return None, 20.0  # Give partial credit even without LLM

    extraction_prompts = {
        "loss_tolerance": f"""From this answer: "{transcript}"
Extract the maximum % portfolio drop the person can tolerate (e.g. 10, 15, 20, 30, 50).
If they say "sell everything" → 5. If they say "buy more" → 40+.
Return JSON: {{"value": <number>, "confidence": <0-40>}}""",

        "horizon": f"""From this answer: "{transcript}"
Extract the investment horizon in years (e.g. 5, 7, 10, 20).
Return JSON: {{"value": <number>, "confidence": <0-40>}}""",

        "income_stability": f"""From this answer: "{transcript}"
Classify income type as one of: salaried_stable, salaried_variable, freelance, business_owner, retired, student.
Return JSON: {{"value": "<income_type>", "confidence": <0-40>}}""",

        "dependents": f"""From this answer: "{transcript}"
Extract: number of dependents AND list of liabilities.
Liabilities: home_loan, car_loan, personal_loan, education_loan, business_loan.
Return JSON: {{"dependents": <number>, "liabilities": ["..."], "confidence": <0-40>}}""",

        "sectors": f"""From this answer: "{transcript}"
Extract preferred and excluded sectors.
Sectors: it, pharma, banking, auto, fmcg, energy, gold, realestate, tobacco, gambling, defense, crypto.
Return JSON: {{"preferred": ["..."], "excluded": ["..."], "confidence": <0-40>}}""",

        "return_risk": f"""From this answer: "{transcript}"
Extract expected annual return % and maximum acceptable loss %.
Also rate risk appetite 0-100 (0=very conservative, 100=very aggressive).
Return JSON: {{"expected_return_pct": <number>, "max_loss_pct": <number>, "risk_appetite": <0-100>, "confidence": <0-40>}}""",
    }

    prompt = extraction_prompts.get(dimension, "")
    if not prompt:
        return None, 15.0

    try:
        response = llm.invoke(prompt)
        raw = response.content.strip()
        # Extract JSON from response
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            data = json.loads(match.group())
            confidence = float(data.pop("confidence", 20))
            # Return remaining fields as the value
            value = data.get("value") or data
            return value, confidence
    except Exception as exc:
        logger.warning(f"Value extraction failed for {dimension}: {exc}")

    return None, 15.0   # Partial credit


def _generate_conflict_question(dimension: str, transcript: str, state: InterviewState) -> str:
    """Generate a conflict-resolution clarification question."""
    llm = _get_llm()
    if not llm:
        return f"You mentioned feeling comfortable with risk — but if you lost a significant amount, what would you actually do?"

    prompt = f"""A user said: "{transcript}"
But their voice showed signs of hesitation (long pauses, slow speech) — suggesting they may not fully mean it.

Generate ONE conflict-resolution question that gently probes the real feeling.
Reference the specific answer. Be warm, not accusatory.
Example: "You mentioned being fine with volatility — but if your portfolio dropped ₹5 lakhs in a month, walk me through what you'd actually do."
Keep under 40 words. Return ONLY the question."""

    try:
        response = llm.invoke(prompt)
        return response.content.strip().strip('"')
    except Exception:
        return "That's interesting — can you tell me more about how you'd realistically react if your portfolio dropped significantly?"


# ── Node: check_coverage ──────────────────────────────────────────────────────
def check_coverage(state: InterviewState) -> str:
    """
    Router node. Returns next node name.
    """
    dim_scores    = state["dimension_scores"]
    q_count       = state["question_count"]
    pending       = state.get("pending_conflict")

    # Hard max questions
    if q_count >= MAX_QUESTIONS:
        return "build_profile"

    # Pending conflict to resolve
    if pending:
        return "select_next_question"

    # Check if all dimensions covered
    all_covered = all(score >= CONFIDENCE_THRESHOLD for score in dim_scores.values())

    if all_covered and q_count >= MIN_QUESTIONS:
        return "build_profile"

    return "select_next_question"


# ── Node: build_profile ───────────────────────────────────────────────────────
def build_profile(state: InterviewState, db: Session) -> dict:
    """
    Aggregate dimension values → user_context JSON.
    Save to PostgreSQL + in-memory cache + transcript to disk.
    """
    from models.db_models import RiskProfile, RiskProfileHistory
    from services.profile_cache import set_cached_profile

    user_id   = state["user_id"]
    dim_values = state["dimension_values"]
    qa_history = state["qa_history"]

    # ── Compute composite risk score ───────────────────────────────────────
    risk_score = _compute_composite_score(state)
    risk_label = _get_risk_label(risk_score)

    # ── Extract structured values from dim_values ──────────────────────────
    horizon_years = None
    if "horizon" in dim_values:
        v = dim_values["horizon"]
        horizon_years = int(v) if isinstance(v, (int, float)) else None

    loss_tolerance_pct = None
    if "loss_tolerance" in dim_values:
        v = dim_values["loss_tolerance"]
        loss_tolerance_pct = float(v) if isinstance(v, (int, float)) else None

    income_stability = dim_values.get("income_stability")
    if isinstance(income_stability, dict):
        income_stability = income_stability.get("value")

    dependents_data = dim_values.get("dependents", {})
    if isinstance(dependents_data, dict):
        dependents     = dependents_data.get("dependents", 0)
        liabilities    = dependents_data.get("liabilities", [])
    else:
        dependents, liabilities = 0, []

    sectors_data = dim_values.get("sectors", {})
    if isinstance(sectors_data, dict):
        preferred_sectors = sectors_data.get("preferred", [])
        excluded_sectors  = sectors_data.get("excluded", [])
    else:
        preferred_sectors, excluded_sectors = [], []

    return_risk_data = dim_values.get("return_risk", {})
    if isinstance(return_risk_data, dict):
        emergency_fund_months = return_risk_data.get("emergency_fund_months", 3.0)
    else:
        emergency_fund_months = 3.0

    # ── Build user_context ─────────────────────────────────────────────────
    user_context = {
        "risk_score":            round(risk_score, 1),
        "risk_label":            risk_label,
        "horizon_years":         horizon_years or 5,
        "loss_tolerance_pct":    loss_tolerance_pct or 15.0,
        "income_stability":      income_stability or "salaried_stable",
        "dependents":            dependents or 0,
        "liabilities":           liabilities,
        "excluded_sectors":      excluded_sectors,
        "preferred_sectors":     preferred_sectors,
        "emergency_fund_months": emergency_fund_months,
        "profile_version":       1,
        "last_updated":          datetime.utcnow().date().isoformat(),
        "dimension_scores":      state["dimension_scores"],
    }

    # ── Save transcript to disk ────────────────────────────────────────────
    transcript_path = _save_transcript(user_id, state["session_id"], qa_history, user_context)

    # ── Save to PostgreSQL ─────────────────────────────────────────────────
    existing = db.query(RiskProfile).filter(RiskProfile.user_id == user_id).first()
    now = datetime.utcnow()

    if existing:
        # Archive to history first
        history = RiskProfileHistory(
            user_id          = user_id,
            profile_version  = existing.profile_version or 1,
            risk_score       = existing.risk_score,
            risk_label       = existing.risk_label,
            dimension_scores = existing.dimension_scores,
            user_context     = json.dumps({
                "risk_label": existing.risk_label,
                "risk_score": existing.risk_score,
            }),
        )
        db.add(history)

        # Update current
        version = (existing.profile_version or 1) + 1
        user_context["profile_version"] = version
        existing.risk_score            = risk_score
        existing.risk_label            = risk_label
        existing.answers               = json.dumps([q["transcript"] for q in qa_history])
        existing.horizon_years         = horizon_years
        existing.loss_tolerance_pct    = loss_tolerance_pct
        existing.income_stability      = income_stability
        existing.dependents            = dependents
        existing.liabilities           = json.dumps(liabilities)
        existing.excluded_sectors      = json.dumps(excluded_sectors)
        existing.preferred_sectors     = json.dumps(preferred_sectors)
        existing.emergency_fund_months = emergency_fund_months
        existing.dimension_scores      = json.dumps(state["dimension_scores"])
        existing.interview_transcript  = str(transcript_path)
        existing.profile_version       = version
        existing.last_updated          = now
        db.commit()
    else:
        profile = RiskProfile(
            user_id               = user_id,
            risk_score            = risk_score,
            risk_label            = risk_label,
            answers               = json.dumps([q["transcript"] for q in qa_history]),
            horizon_years         = horizon_years,
            loss_tolerance_pct    = loss_tolerance_pct,
            income_stability      = income_stability,
            dependents            = dependents,
            liabilities           = json.dumps(liabilities),
            excluded_sectors      = json.dumps(excluded_sectors),
            preferred_sectors     = json.dumps(preferred_sectors),
            emergency_fund_months = emergency_fund_months,
            dimension_scores      = json.dumps(state["dimension_scores"]),
            interview_transcript  = str(transcript_path),
            profile_version       = 1,
            last_updated          = now,
        )
        db.add(profile)
        db.commit()

    # ── Cache ──────────────────────────────────────────────────────────────
    set_cached_profile(user_id, user_context)
    logger.info(f"Profile built for {user_id}: score={risk_score} label={risk_label}")

    return user_context


# ── Helpers ───────────────────────────────────────────────────────────────────
def _compute_composite_score(state: InterviewState) -> float:
    """
    Weighted composite of dimension values → single 0-100 risk score.
    Weights reflect importance: loss tolerance + horizon are most predictive.
    """
    dim_values = state["dimension_values"]
    weights = {
        "loss_tolerance":  0.30,
        "horizon":         0.25,
        "return_risk":     0.20,
        "income_stability": 0.10,
        "dependents":      0.10,
        "sectors":         0.05,
    }

    # Normalize each dimension to 0-100
    def normalize(dim: str) -> float:
        v = dim_values.get(dim)
        if v is None:
            return 40.0  # neutral default

        if dim == "loss_tolerance":
            # E.g. 5% tolerance → conservative (low score), 40% → aggressive (high score)
            pct = float(v) if isinstance(v, (int, float)) else 15.0
            return min(pct * 2.0, 100.0)   # 0-50% drop → 0-100 score

        elif dim == "horizon":
            yrs = float(v) if isinstance(v, (int, float)) else 5.0
            return min(yrs * 5.0, 100.0)   # 0-20 years → 0-100

        elif dim == "return_risk":
            if isinstance(v, dict):
                return float(v.get("risk_appetite", 50))
            return 50.0

        elif dim == "income_stability":
            mapping = {
                "salaried_stable":   80.0,
                "salaried_variable": 60.0,
                "freelance":         50.0,
                "business_owner":    55.0,
                "retired":           40.0,
                "student":           30.0,
            }
            val = v if isinstance(v, str) else str(v)
            return mapping.get(val, 50.0)

        elif dim == "dependents":
            if isinstance(v, dict):
                n_dep = int(v.get("dependents", 0))
                n_lia = len(v.get("liabilities", []))
            else:
                n_dep, n_lia = 0, 0
            # More dependents/liabilities → more conservative
            return max(0.0, 80.0 - (n_dep * 10.0) - (n_lia * 15.0))

        elif dim == "sectors":
            # Sector preference doesn't affect composite risk score numerically
            return 50.0

        return 50.0

    score = sum(weights[dim] * normalize(dim) for dim in weights)
    return round(min(max(score, 0.0), 100.0), 2)


def _get_risk_label(score: float) -> str:
    if score < 25:  return "conservative"
    if score < 45:  return "moderate_conservative"
    if score < 65:  return "moderate"
    if score < 80:  return "moderate_aggressive"
    return "aggressive"


def _save_transcript(
    user_id: str, session_id: str, qa_history: list[dict], user_context: dict
) -> Path:
    """Save full interview transcript to disk."""
    dir_path = TRANSCRIPT_DIR / user_id
    dir_path.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    file_path = dir_path / f"interview_{session_id}_{timestamp}.json"

    data = {
        "user_id":      user_id,
        "session_id":   session_id,
        "completed_at": datetime.utcnow().isoformat(),
        "user_context": user_context,
        "qa_history":   qa_history,
    }

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)

    logger.info(f"Transcript saved: {file_path}")
    return file_path


# ── Session store (in-memory, keyed by session_id) ────────────────────────────
_sessions: dict[str, InterviewState] = {}


def create_session(user_id: str, session_id: str, db: Session) -> InterviewState:
    """Initialize a new interview session and run load_profile."""
    initial_state: InterviewState = {
        "user_id":          user_id,
        "session_id":       session_id,
        "question_count":   0,
        "dimension_scores": {dim: 0.0 for dim in DIMENSIONS},
        "dimension_values": {},
        "qa_history":       [],
        "conflicts":        [],
        "current_question": "",
        "current_dimension": "",
        "pending_conflict": None,
        "is_retake":        False,
        "prior_profile":    None,
        "done":             False,
        "skip":             False,
        "error":            None,
    }

    state = load_profile(initial_state, db)

    if not state["skip"]:
        state = select_next_question(state)

    _sessions[session_id] = state
    return state


def get_session(session_id: str) -> Optional[InterviewState]:
    return _sessions.get(session_id)


def submit_answer(
    session_id: str,
    transcript: str,
    prosody: dict,
    db: Session,
) -> dict:
    """
    Process one answer and return next state.
    Returns: {next_question, current_dimension, dimension_scores, done, user_context}
    """
    state = _sessions.get(session_id)
    if not state:
        raise ValueError(f"Session {session_id} not found")

    # Score the answer
    state = score_answer(state, transcript, prosody)

    # Check coverage → route
    next_node = check_coverage(state)

    if next_node == "build_profile":
        user_context = build_profile(state, db)
        state["done"] = True
        _sessions[session_id] = state
        return {
            "done":             True,
            "user_context":     user_context,
            "question_count":   state["question_count"],
            "dimension_scores": state["dimension_scores"],
        }

    # Continue interview
    state = select_next_question(state)
    _sessions[session_id] = state

    return {
        "done":             False,
        "next_question":    state["current_question"],
        "current_dimension": state["current_dimension"],
        "dimension_scores": state["dimension_scores"],
        "question_count":   state["question_count"],
        "conflict_flagged": bool(state.get("pending_conflict")),
    }


def force_finish(session_id: str, db: Session) -> dict:
    """Force-complete the interview with whatever scores exist."""
    state = _sessions.get(session_id)
    if not state:
        raise ValueError(f"Session {session_id} not found")
    user_context = build_profile(state, db)
    state["done"] = True
    _sessions[session_id] = state
    return {"done": True, "user_context": user_context}
