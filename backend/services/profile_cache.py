"""
backend/services/profile_cache.py

In-memory profile cache with a size-bounded LRU eviction policy.
  - Dev/MVP:  pure Python dict (no infrastructure needed)
  - Production swap: set REDIS_URL in .env → same interface, Redis backend

Every downstream agent calls get_cached_profile(user_id) at the start of
each request instead of hitting PostgreSQL. Read latency: ~0.01ms.
"""

from __future__ import annotations

import json
import logging
import os
from collections import OrderedDict
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
REDIS_URL   = os.getenv("REDIS_URL", "")          # Empty = use in-memory cache
MAX_ENTRIES = 500                                   # Max users in memory at once
CACHE_TTL_S = 3600                                  # 1 hour TTL per entry (seconds)


# ── In-memory LRU store ──────────────────────────────────────────────────────

class _LRUCache:
    """Thread-safe(ish) LRU cache for user_context dicts."""

    def __init__(self, maxsize: int = MAX_ENTRIES):
        self._store: OrderedDict[str, tuple[dict, float]] = OrderedDict()
        self._maxsize = maxsize

    def get(self, key: str) -> Optional[dict]:
        if key not in self._store:
            return None
        entry, stored_at = self._store[key]
        # TTL check
        if (datetime.utcnow().timestamp() - stored_at) > CACHE_TTL_S:
            del self._store[key]
            return None
        # Move to end (most recently used)
        self._store.move_to_end(key)
        return entry

    def set(self, key: str, value: dict) -> None:
        if key in self._store:
            self._store.move_to_end(key)
        self._store[key] = (value, datetime.utcnow().timestamp())
        if len(self._store) > self._maxsize:
            # Evict least recently used
            self._store.popitem(last=False)

    def delete(self, key: str) -> None:
        self._store.pop(key, None)

    def __len__(self) -> int:
        return len(self._store)


_mem_cache = _LRUCache()


# ── Redis adapter (optional) ──────────────────────────────────────────────────

def _get_redis():
    """Return a Redis client if REDIS_URL is configured, else None."""
    if not REDIS_URL:
        return None
    try:
        import redis  # type: ignore
        return redis.from_url(REDIS_URL, decode_responses=True)
    except ImportError:
        logger.warning("redis package not installed — using in-memory cache")
        return None
    except Exception as exc:
        logger.warning(f"Redis connection failed ({exc}) — using in-memory cache")
        return None


# ── Public API ────────────────────────────────────────────────────────────────

def get_cached_profile(user_id: str) -> Optional[dict]:
    """
    Retrieve user_context for user_id from cache.
    Returns None if not cached or expired.
    Falls back to in-memory cache if Redis is unavailable.
    """
    r = _get_redis()
    if r:
        try:
            raw = r.get(f"profile:{user_id}")
            return json.loads(raw) if raw else None
        except Exception as exc:
            logger.warning(f"Redis GET failed ({exc}) — falling back to in-memory cache")
    return _mem_cache.get(user_id)


def set_cached_profile(user_id: str, profile: dict) -> None:
    """
    Store user_context for user_id in cache.
    Also stamps 'cached_at' so callers can see cache freshness.
    Falls back to in-memory cache if Redis is unavailable.
    """
    profile["cached_at"] = datetime.utcnow().isoformat()
    r = _get_redis()
    if r:
        try:
            r.setex(f"profile:{user_id}", CACHE_TTL_S, json.dumps(profile))
            logger.debug(f"Profile cached for user {user_id} (redis)")
            return
        except Exception as exc:
            logger.warning(f"Redis SETEX failed ({exc}) — falling back to in-memory cache")
    _mem_cache.set(user_id, profile)
    logger.debug(f"Profile cached for user {user_id} (memory)")


def invalidate_profile(user_id: str) -> None:
    """
    Remove user_id from cache (e.g. after a retake completes).
    The next read will load fresh from PostgreSQL.
    Falls back to in-memory cache if Redis is unavailable.
    """
    r = _get_redis()
    if r:
        try:
            r.delete(f"profile:{user_id}")
            logger.debug(f"Profile cache invalidated for user {user_id} (redis)")
            return
        except Exception as exc:
            logger.warning(f"Redis DELETE failed ({exc}) — falling back to in-memory cache")
    _mem_cache.delete(user_id)
    logger.debug(f"Profile cache invalidated for user {user_id} (memory)")


def cache_stats() -> dict:
    """Debug endpoint data — how many profiles are currently cached."""
    r = _get_redis()
    if r:
        try:
            keys = r.keys("profile:*")
            return {"backend": "redis", "cached_profiles": len(keys)}
        except Exception as exc:
            logger.warning(f"Redis KEYS failed ({exc}) — reporting memory stats")
    return {"backend": "memory", "cached_profiles": len(_mem_cache)}
