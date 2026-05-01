"""
backend/utils/analysis_router.py

Zero-token rule-based router for the /analysis page.

Replaces the LLM orchestrator pattern (which burns 300-500 tokens
per decision) with a pure Python keyword dispatch.  An LLM is only
called when actual analysis content is needed — NOT to decide *which*
agent to call.

Usage:
    from utils.analysis_router import route_analysis_request

    agent_key = route_analysis_request(
        user_input=user_input,
        has_profile=True,
        has_goal=True,
    )
    # Returns one of: "onboarding_agent", "portfolio_agent",
    #                 "screener_agent", "projection_agent", "general_agent"
"""

from __future__ import annotations

import re

# ---------------------------------------------------------------------------
# Keyword groups (lowercase) — ordered by specificity to avoid false matches
# ---------------------------------------------------------------------------

_PORTFOLIO_KEYWORDS = frozenset([
    "portfolio", "allocat", "rebalanc", "realloc", "diversif",
    "holdings", "position", "exposure", "weight", "underweight", "overweight",
    "risk", "hedg", "drawdown", "volatil", "beta", "correlation",
])

_SCREENER_KEYWORDS = frozenset([
    "stock", "share", "fund", "etf", "mf", "mutual fund", "nifty",
    "sector", "industry", "pe ratio", "p/e", "roe", "roce",
    "large cap", "mid cap", "small cap", "bluechip", "momentum",
    "undervalue", "growth stock", "screener", "filter",
])

_PROJECTION_KEYWORDS = frozenset([
    "when", "target", "reach", "goal", "cagr", "return", "project",
    "forecast", "timeline", "retire", "corpus", "sip", "compound",
    "year", "grow", "achieve", "millio", "lakh", "crore",
])

_NEWS_KEYWORDS = frozenset([
    "news", "market", "today", "rbi", "fed", "rate", "crude",
    "fii", "dii", "inflation", "gdp", "sensex", "nifty", "vix",
    "rupee", "dollar", "gold price", "bitcoin", "crypto", "earnings",
    "result", "quarterly", "ipo", "budget",
])


def _contains_any(text: str, keywords: frozenset) -> bool:
    """True if any keyword appears as a (partial) word in text."""
    text_lower = text.lower()
    return any(kw in text_lower for kw in keywords)


def route_analysis_request(
    user_input: str,
    has_profile: bool = True,
    has_goal: bool = True,
) -> str:
    """
    Zero-token routing — returns which agent should handle this request.

    Priority order:
      1. Onboarding   — user has no profile yet
      2. Portfolio     — mentions portfolio/allocation/risk
      3. Screener      — mentions stocks/funds/sector filters
      4. Projection    — mentions timelines/goals/CAGR
      5. News context  — market news questions (hand off to news_group)
      6. General       — everything else (chat_engine)

    Returns
    -------
    str
        One of: "onboarding_agent", "portfolio_agent",
                "screener_agent", "projection_agent",
                "news_agent", "general_agent"
    """
    if not has_profile:
        return "onboarding_agent"

    if _contains_any(user_input, _PORTFOLIO_KEYWORDS):
        return "portfolio_agent"

    if _contains_any(user_input, _SCREENER_KEYWORDS):
        return "screener_agent"

    if _contains_any(user_input, _PROJECTION_KEYWORDS):
        return "projection_agent"

    if _contains_any(user_input, _NEWS_KEYWORDS):
        return "news_agent"

    return "general_agent"


def get_estimated_tokens(user_input: str, agent_key: str) -> int:
    """
    Heuristic token budget estimate for the rate limiter.
    Returns a conservative estimate so the limiter stays safe.
    """
    _budgets = {
        "onboarding_agent": 300,
        "portfolio_agent":  700,
        "screener_agent":   400,
        "projection_agent": 500,
        "news_agent":       600,
        "general_agent":    400,
    }
    base = _budgets.get(agent_key, 500)
    # Add ~4 tokens per word in the user input
    input_est = max(50, len(user_input.split()) * 4)
    return base + input_est
