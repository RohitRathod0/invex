"""
backend/utils/resilient_llm.py

Resilient wrapper around LiteLLM / LangChain calls with:
  - Exponential backoff on 429 / rate-limit errors
  - Automatic provider failover (Mistral → Groq → Gemini)
  - Per-group model configuration to isolate analysis vs news token pools

Model groups
────────────
  analysis_group   mistral-large-latest (primary, paid subscription)
                   → mistral-small-latest (lighter Mistral fallback)
                   → groq/llama-3.1-8b-instant (last resort)
                   → gemini/gemini-2.0-flash (emergency, free tier exhausts fast)

  news_group       groq/llama-3.1-8b-instant (primary, 6k TPM free tier)
                   → mistral-small-latest (fallback)
                   → gemini/gemini-2.0-flash (last resort)

Usage:
    from utils.resilient_llm import resilient_llm_call, get_langchain_llm

    # Direct async call (returns litellm ModelResponse)
    response = await resilient_llm_call(messages, group="analysis_group")

    # LangChain-compatible ChatModel with built-in fallbacks
    llm = get_langchain_llm(group="analysis_group")
    result = await llm.ainvoke(messages)
"""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Model group definitions
# Each group is a priority-ordered list of (provider/model, max_tokens) tuples.
# Mistral is PRIMARY for analysis — stable paid quota, no free-tier daily caps.
# ---------------------------------------------------------------------------
_MODEL_GROUPS: dict[str, list[tuple[str, int]]] = {
    "analysis_group": [
        ("mistral/mistral-large-latest",      8192),  # PRIMARY — paid, stable
        ("mistral/mistral-small-latest",      4096),  # fallback 1 — lighter Mistral
        ("groq/llama-3.1-8b-instant",         2048),  # fallback 2 — fast, low quota
        ("gemini/gemini-2.0-flash",           8192),  # emergency — free tier exhausts fast
    ],
    "news_group": [
        ("groq/llama-3.1-8b-instant",         2048),  # PRIMARY — fast, 6k TPM
        ("mistral/mistral-small-latest",      2048),  # fallback 1
        ("gemini/gemini-2.0-flash",           4096),  # fallback 2
    ],
    "screener_group": [
        ("groq/llama-3.1-8b-instant",         1024),  # PRIMARY — fast, low tokens
        ("mistral/mistral-small-latest",      2048),  # fallback
    ],
}

# Errors that indicate "this provider is exhausted; try the next one"
_LIMIT_KEYWORDS = (
    "429", "rate limit", "rate_limit", "token", "context_length", "quota",
    "too large", "capacity", "resource_exhausted", "decommissioned",
    "invalid_request", "not supported", "does not exist", "model_not_found",
    "not found", "overloaded", "free_tier", "limit: 0",
)


def _is_retriable(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(k in msg for k in _LIMIT_KEYWORDS)


# ---------------------------------------------------------------------------
# Core async call with exponential backoff + provider failover
# ---------------------------------------------------------------------------

async def resilient_llm_call(
    messages: list[dict],
    group: str = "analysis_group",
    max_retries_per_model: int = 3,
    **kwargs: Any,
) -> Any:
    """
    Attempt the LiteLLM completion across all models in the group.
    Within each model: up to `max_retries_per_model` attempts with
    exponential backoff (2s, 4s, 8s …).

    Returns the first successful litellm ModelResponse.
    Raises the last exception if all models fail.
    """
    import litellm  # local import to keep startup fast

    models = _MODEL_GROUPS.get(group, _MODEL_GROUPS["analysis_group"])
    last_exc: Exception | None = None

    for model, max_tokens in models:
        for attempt in range(max_retries_per_model):
            try:
                logger.info(f"[ResilientLLM] {group} → {model} (attempt {attempt + 1})")
                response = await litellm.acompletion(
                    model=model,
                    messages=messages,
                    max_tokens=kwargs.pop("max_tokens", max_tokens),
                    **kwargs,
                )
                return response
            except Exception as exc:
                last_exc = exc
                if _is_retriable(exc):
                    if attempt < max_retries_per_model - 1:
                        wait = (2 ** attempt) + 1   # 2, 3, 5 s
                        logger.warning(
                            f"[ResilientLLM] {model} hit limit (attempt {attempt + 1}): "
                            f"{str(exc)[:80]}. Retrying in {wait}s …"
                        )
                        await asyncio.sleep(wait)
                    else:
                        logger.warning(
                            f"[ResilientLLM] {model} exhausted all retries. "
                            f"Falling back to next model in group …"
                        )
                        break
                else:
                    # Non-retriable error — skip remaining retries for this model
                    logger.error(f"[ResilientLLM] {model} non-retriable error: {exc}")
                    break

    raise last_exc or RuntimeError(f"All models in {group!r} failed.")


# ---------------------------------------------------------------------------
# LangChain-compatible wrapper with automatic fallback chain
# ---------------------------------------------------------------------------

def get_langchain_llm(group: str = "analysis_group"):
    """
    Returns a LangChain ChatModel pre-wired with .with_fallbacks() for the
    given group.

    PRIMARY for analysis_group: Mistral large-latest (paid subscription, stable quota).
    PRIMARY for news_group/screener_group: Groq llama-3.1-8b-instant (fastest, free tier).
    """
    if group == "analysis_group":
        from langchain_mistralai import ChatMistralAI
        from langchain_groq import ChatGroq

        primary = ChatMistralAI(
            model="mistral-large-latest",
            api_key=os.environ.get("MISTRAL_API_KEY"),
            temperature=0.2,
            max_tokens=8192,
        )
        fallback1 = ChatMistralAI(
            model="mistral-small-latest",
            api_key=os.environ.get("MISTRAL_API_KEY"),
            temperature=0.2,
            max_tokens=4096,
        )
        fallback2 = ChatGroq(
            model="llama-3.1-8b-instant",
            api_key=os.environ.get("GROQ_API_KEY"),
            temperature=0,
            max_tokens=2048,
        )
        return primary.with_fallbacks([fallback1, fallback2])

    elif group == "news_group":
        from langchain_groq import ChatGroq
        from langchain_mistralai import ChatMistralAI

        primary = ChatGroq(
            model="llama-3.1-8b-instant",
            api_key=os.environ.get("GROQ_API_KEY"),
            temperature=0,
            max_tokens=2048,
        )
        fallback1 = ChatMistralAI(
            model="mistral-small-latest",
            api_key=os.environ.get("MISTRAL_API_KEY"),
            temperature=0.1,
            max_tokens=2048,
        )
        return primary.with_fallbacks([fallback1])

    elif group == "screener_group":
        from langchain_groq import ChatGroq
        from langchain_mistralai import ChatMistralAI

        primary = ChatGroq(
            model="llama-3.1-8b-instant",
            api_key=os.environ.get("GROQ_API_KEY"),
            temperature=0,
            max_tokens=1024,
        )
        fallback = ChatMistralAI(
            model="mistral-small-latest",
            api_key=os.environ.get("MISTRAL_API_KEY"),
            temperature=0,
            max_tokens=2048,
        )
        return primary.with_fallbacks([fallback])

    else:
        raise ValueError(f"Unknown group: {group!r}. Use 'analysis_group', 'news_group', or 'screener_group'.")
