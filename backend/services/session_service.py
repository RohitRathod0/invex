"""
services/session_service.py

Session management backed by MongoDB (invex_db.chat_sessions).
This replaces the old DynamoDB-based implementation.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional
from models.mongo import get_mongo_db
from models.api_models import Session


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class SessionService:
    """Thin async wrapper around the chat_sessions MongoDB collection."""

    @property
    def _col(self):
        return get_mongo_db()["chat_sessions"]

    async def create_session(self, user_name: str = "Anonymous", user_id: Optional[str] = None) -> Session:
        session_id = str(uuid.uuid4())
        now = _now_iso()

        doc = {
            "session_id": session_id,
            "user_name": user_name,
            "user_id": user_id,
            "title": "New Chat",
            "created_at": now,
            "last_message_at": now,
            "messages": [],
        }

        await self._col.insert_one(doc)

        return Session(
            session_id=session_id,
            user_name=user_name,
            created_at=now,
            status="active",
            messages=[],
        )

    async def get_session(self, session_id: str) -> Optional[Session]:
        doc = await self._col.find_one({"session_id": session_id}, {"_id": 0})
        if not doc:
            return None

        return Session(
            session_id=doc["session_id"],
            user_name=doc.get("user_name", "Anonymous"),
            created_at=doc.get("created_at", _now_iso()),
            status="active",
            messages=doc.get("messages", []),
        )

    async def add_message(self, session_id: str, role: str, content: str):
        """Append a single message to the session's messages array."""
        msg = {
            "id": str(uuid.uuid4()),
            "role": role,
            "content": content,
            "timestamp": _now_iso(),
        }
        now = _now_iso()
        await self._col.update_one(
            {"session_id": session_id},
            {
                "$push": {"messages": msg},
                "$set": {"last_message_at": now},
            },
        )


# Singleton instance
session_service = SessionService()
