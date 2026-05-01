"""
models/mongo.py

Async MongoDB connection via Motor.
Call `get_db()` to get the `invex_db` database instance.
Collections are accessed as: db["users"], db["audit_logs"], etc.
"""

from motor.motor_asyncio import AsyncIOMotorClient
from config import get_settings
import logging

logger = logging.getLogger(__name__)

_client: AsyncIOMotorClient | None = None


def get_mongo_client() -> AsyncIOMotorClient:
    """Returns the shared Motor client (created once on first call)."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = AsyncIOMotorClient(settings.MONGO_URI)
        logger.info("MongoDB client initialised (Motor / Atlas)")
    return _client


def get_mongo_db():
    """Returns the `invex_db` database handle."""
    client = get_mongo_client()
    return client["invex_db"]


async def close_mongo():
    """Call during app shutdown to gracefully close the connection."""
    global _client
    if _client:
        _client.close()
        _client = None
        logger.info("MongoDB client closed")
