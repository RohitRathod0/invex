"""
backend/utils/context_compressor.py

Compresses a full user risk-profile dict into a ~150-token string
that can be injected into every agent system prompt WITHOUT bloating
the context window.

The compressed string is cached in memory at onboarding completion time.
Every subsequent agent call reads from this cache — zero extra DB hits.

Usage:
    from utils.context_compressor import set_user_context, get_user_context

    # At /onboarding completion:
    set_user_context(user_id, full_profile_dict)

    # Inside any agent system prompt:
    context = get_user_context(user_id)
    system_prompt = f"You are an investment analyst. User context: {context}\\n\\n..."
"""

from __future__ import annotations

import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# In-memory store — swap to Redis by setting REDIS_URL in .env
# (profile_cache already handles that layer; this is a separate token-budget
# cache that stores only the *compressed* string, not the full profile)
# ---------------------------------------------------------------------------
_compressed_cache: dict[str, tuple[str, float]] = {}   # {user_id: (compressed_str, epoch)}

# How long to keep the compressed string before re-compressing (matches profile TTL)
_TTL_SECONDS = 3600


def compress_risk_profile(profile: dict) -> str:
    """
    Converts a full risk-profile object into a ~150-token string.

    Handles both the flat onboarding format and the nested DB format
    gracefully — missing keys are silently skipped.
    """
    risk        = profile.get("risk_tolerance") or profile.get("risk_category", "moderate")
    horizon     = profile.get("time_horizon_years") or profile.get("duration_years", "?")
    goal        = profile.get("goal") or profile.get("investment_goal", "wealth creation")
    capital     = profile.get("investment_amount") or profile.get("capital_amount", 0)
    sectors     = profile.get("preferred_sectors", []) or []
    avoid       = profile.get("avoid_sectors", []) or []
    experience  = profile.get("experience_level", "")
    liquidity   = profile.get("liquidity_needs", "")

    parts = [
        f"Risk: {risk}",
        f"Horizon: {horizon}yr",
        f"Goal: {goal}",
        f"Capital: ₹{capital:,}" if isinstance(capital, (int, float)) and capital else f"Capital: {capital}",
    ]

    if sectors:
        parts.append(f"Sectors: {', '.join(str(s) for s in sectors[:4])}")
    if avoid:
        parts.append(f"Avoid: {', '.join(str(s) for s in avoid[:3])}")
    if experience:
        parts.append(f"Exp: {experience}")
    if liquidity:
        parts.append(f"Liquidity: {liquidity}")

    return " | ".join(parts)


def set_user_context(user_id: str, profile: dict) -> str:
    """
    Compress and cache the profile for user_id.
    Returns the compressed string (so callers can use it immediately).
    """
    compressed = compress_risk_profile(profile)
    _compressed_cache[user_id] = (compressed, datetime.utcnow().timestamp())
    logger.debug(f"[ContextCompressor] Cached context for user {user_id} ({len(compressed)} chars)")
    return compressed


def get_user_context(user_id: str) -> str:
    """
    Retrieve the cached compressed context string.
    Falls back to a sensible default if no profile has been set yet.
    """
    entry = _compressed_cache.get(user_id)
    if entry is None:
        return "No risk profile set — treat user as a moderate, balanced investor."

    compressed, cached_at = entry
    age = datetime.utcnow().timestamp() - cached_at
    if age > _TTL_SECONDS:
        # Stale — ask caller to refresh
        del _compressed_cache[user_id]
        return "Risk profile expired — treat user as a moderate, balanced investor."

    return compressed

