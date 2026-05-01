import json
import logging
import time
from typing import Any, Optional

logger = logging.getLogger("invex.cache")


class InMemoryCache:
    """
    Simple in-memory TTL cache used when Redis is unavailable.
    Thread-safe for single-process use (asyncio event loop).
    """
    def __init__(self):
        self._store: dict[str, tuple[Any, float]] = {}  # key → (value, expires_at)

    def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        if entry is None:
            return None
        value, expires_at = entry
        if time.monotonic() > expires_at:
            del self._store[key]
            return None
        return value

    def set(self, key: str, value: Any, expire_seconds: int = 300):
        self._store[key] = (value, time.monotonic() + expire_seconds)

    def delete(self, key: str):
        self._store.pop(key, None)


_memory_cache = InMemoryCache()


class CacheManager:
    """
    Manages market data caching.
    Primary: Redis (low-latency, shared across workers).
    Fallback: In-process memory cache (single-worker only, still beats no-cache).
    """

    def __init__(self, redis_url: str = "redis://localhost:6379/0"):
        self.redis_url = redis_url
        self._redis = None
        self._redis_available: Optional[bool] = None  # None = untested

    async def _get_client(self):
        if self._redis_available is False:
            return None
        try:
            if self._redis is None:
                import redis.asyncio as redis
                self._redis = redis.from_url(self.redis_url, decode_responses=True,
                                             socket_connect_timeout=1)
            # Quick ping to verify connection
            await self._redis.ping()
            self._redis_available = True
            return self._redis
        except Exception:
            if self._redis_available is not False:
                logger.info("Redis not available — using in-memory cache fallback.")
            self._redis_available = False
            self._redis = None
            return None

    async def get(self, key: str) -> Optional[Any]:
        client = await self._get_client()
        if client:
            try:
                val = await client.get(key)
                if val:
                    return json.loads(val)
            except Exception as e:
                logger.debug(f"Redis get error for {key}: {e}")
        # Fallback to memory
        return _memory_cache.get(key)

    async def set(self, key: str, value: Any, expire_seconds: int = 300) -> bool:
        client = await self._get_client()
        if client:
            try:
                await client.setex(key, expire_seconds, json.dumps(value))
                return True
            except Exception as e:
                logger.debug(f"Redis set error for {key}: {e}")
        # Fallback to memory
        _memory_cache.set(key, value, expire_seconds)
        return True

    async def delete(self, key: str) -> bool:
        client = await self._get_client()
        if client:
            try:
                await client.delete(key)
            except Exception as e:
                logger.debug(f"Redis delete error for {key}: {e}")
        _memory_cache.delete(key)
        return True


# Global instance
cache = CacheManager()
