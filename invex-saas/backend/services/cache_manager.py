import json
import logging
from typing import Any, Optional
import redis.asyncio as redis

logger = logging.getLogger("invex.cache")

class CacheManager:
    """
    Manages Redis caching for market data to reduce API calls and latency.
    """
    def __init__(self, redis_url: str = "redis://localhost:6379/0"):
        self.redis_url = redis_url
        self._redis = None

    async def _get_client(self) -> redis.Redis:
        if self._redis is None:
            self._redis = redis.from_url(self.redis_url, decode_responses=True)
        return self._redis

    async def get(self, key: str) -> Optional[Any]:
        """Retrieve and deserialize a value from the cache."""
        try:
            client = await self._get_client()
            val = await client.get(key)
            if val:
                return json.loads(val)
            return None
        except Exception as e:
            logger.warning(f"Cache miss/error for key {key}: {e}")
            return None

    async def set(self, key: str, value: Any, expire_seconds: int = 300) -> bool:
        """Serialize and store a value in the cache with an expiration."""
        try:
            client = await self._get_client()
            serialized = json.dumps(value)
            await client.setex(key, expire_seconds, serialized)
            return True
        except Exception as e:
            logger.warning(f"Failed to cache key {key}: {e}")
            return False

    async def delete(self, key: str) -> bool:
        """Delete a key from the cache."""
        try:
            client = await self._get_client()
            await client.delete(key)
            return True
        except Exception as e:
            logger.warning(f"Failed to delete cache key {key}: {e}")
            return False

# Global instance
cache = CacheManager()
