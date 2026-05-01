"""
backend/routers/chat_router.py

Chat API — uses LangGraph ChatEngine for AI responses.
Every conversation (user message + AI reply) is stored in MongoDB
under invex_db.chat_sessions as a readable message thread.

MongoDB document structure (chat_sessions collection):
{
    "session_id":      "uuid",
    "user_name":       "Rohit Rathod",
    "user_id":         "...",            # optional
    "title":           "What if I invested ₹1L in Nifty?",
    "mode":            "what-if",        # last used mode
    "created_at":      "2026-05-01T...",
    "last_message_at": "2026-05-01T...",
    "messages": [
        {
            "id":        "uuid",
            "role":      "user",
            "content":   "What if I invested ₹1L in Nifty 50 in Jan 2024?",  ← CLEAN text
            "mode":      "what-if",
            "timestamp": "2026-05-01T..."
        },
        {
            "id":             "uuid",
            "role":           "ai",
            "content":        "Great question! In Jan 2024, Nifty 50 was at...",
            "mode":           "what-if",
            "execution_time": 2.3,
            "timestamp":      "2026-05-01T..."
        },
        ...
    ]
}
"""

import time
import sys
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

from models.mongo import get_mongo_db

router = APIRouter(prefix="/chat", tags=["chat"])

# ── Add crew_core to path & load its .env ────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent.parent
CREW_CORE_DIR = BASE_DIR / "crew_core"
sys.path.append(str(CREW_CORE_DIR / "src"))

crew_env_file = CREW_CORE_DIR / ".env"
if crew_env_file.exists():
    with open(crew_env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, _, val = line.partition('=')
                os.environ.setdefault(key.strip(), val.strip())

# ── Lazy-load ChatEngine so startup stays fast ────────────────────────────────
_chat_engine = None

def get_chat_engine():
    global _chat_engine
    if _chat_engine is None:
        from invex.engines.chat_engine import ChatEngine
        _chat_engine = ChatEngine()
    return _chat_engine


# ── Pydantic models ───────────────────────────────────────────────────────────

class ChatMessageRequest(BaseModel):
    # The full system-prompt+message string sent to the AI engine
    message: str

    # The clean user text (what they actually typed) — stored in MongoDB
    original_message: Optional[str] = None

    # Chat mode label (agent-debrief / news-radar / what-if / calm-mode / memory / default)
    mode: Optional[str] = "default"

    # Session continuity
    session_id: Optional[str] = None

    # User identity for the session
    user_name: Optional[str] = "Invex User"
    user_id: Optional[str] = None

    # Extra context passed to the AI engine (not stored verbatim)
    context: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ChatMessageResponse(BaseModel):
    reply: str
    session_id: str
    execution_time: float
    status: str


class CreateSessionRequest(BaseModel):
    user_name: Optional[str] = "Invex User"
    user_id: Optional[str] = None


class ChatSessionResponse(BaseModel):
    session_id: str
    user_name: str
    user_id: Optional[str] = None
    title: str
    mode: str
    created_at: str
    last_message_at: str
    message_count: int
    messages: List[Dict[str, Any]]


# ── Internal helpers ──────────────────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _get_or_create_session(
    session_id: Optional[str],
    user_name: str = "Invex User",
    user_id: Optional[str] = None,
) -> dict:
    """Return an existing session doc by ID, or create and persist a new one."""
    col = get_mongo_db()["chat_sessions"]

    if session_id:
        doc = await col.find_one({"session_id": session_id}, {"_id": 0})
        if doc:
            return doc

    # New session
    sid = session_id or str(uuid.uuid4())
    now = _now_iso()
    doc = {
        "session_id":      sid,
        "user_name":       user_name,
        "user_id":         user_id,
        "title":           "New Chat",
        "mode":            "default",
        "created_at":      now,
        "last_message_at": now,
        "messages":        [],
    }
    await col.insert_one(doc)
    # Return without Mongo _id
    doc.pop("_id", None)
    return doc


async def _save_conversation_turn(
    session_id: str,
    user_text: str,    # the CLEAN message the user typed
    ai_text: str,      # the AI reply
    mode: str,
    execution_time: float,
) -> None:
    """
    Atomically push both user and AI messages into the session document
    and update last_message_at and mode.
    Also sets the session title from the first user message.
    """
    col = get_mongo_db()["chat_sessions"]
    now = _now_iso()

    user_msg = {
        "id":        str(uuid.uuid4()),
        "role":      "user",
        "content":   user_text,
        "mode":      mode,
        "timestamp": now,
    }
    ai_msg = {
        "id":             str(uuid.uuid4()),
        "role":           "ai",
        "content":        ai_text,
        "mode":           mode,
        "execution_time": round(execution_time, 3),
        "timestamp":      now,
    }

    await col.update_one(
        {"session_id": session_id},
        {
            "$push": {"messages": {"$each": [user_msg, ai_msg]}},
            "$set":  {"last_message_at": now, "mode": mode},
        },
    )

    # Set title from first user message (only while it is still "New Chat")
    snippet = user_text[:60] + ("..." if len(user_text) > 60 else "")
    await col.update_one(
        {"session_id": session_id, "title": "New Chat"},
        {"$set": {"title": snippet}},
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/message", response_model=ChatMessageResponse)
async def chat_message(body: ChatMessageRequest):
    """
    Main chat endpoint.

    Flow:
      1. Ensure session exists in MongoDB (create if missing).
      2. Feed the full system-prompt message to the AI engine.
      3. Store ONLY the clean user text + AI reply in MongoDB
         so the conversation is readable in the DB.
      4. Return the AI reply and session_id to the caller.
    """
    # 1. Session resolution
    session_doc = await _get_or_create_session(
        session_id=body.session_id,
        user_name=body.user_name or "Invex User",
        user_id=body.user_id,
    )
    session_id = session_doc["session_id"]

    # The text we actually store = original_message if provided, else fall back to body.message
    # This prevents the system-prompt blob from being saved.
    display_text = (body.original_message or body.message).strip()
    mode = body.mode or "default"

    # 2. Run AI engine
    start = time.time()
    try:
        engine = get_chat_engine()
        result = await engine.run({
            "topic":      body.message,   # full prompt → AI engine
            "session_id": session_id,
            **(body.context or {}),
        })

        reply = (
            result.get("result", {}).get("report")
            or result.get("result", {}).get("structured_data")
            or "I'm sorry, I couldn't generate a response."
        )
        reply = str(reply)
        execution_time = result.get("execution_time", round(time.time() - start, 3))
        status = result.get("status", "success")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # 3. Persist the real conversation to MongoDB
    await _save_conversation_turn(
        session_id=session_id,
        user_text=display_text,   # ← clean user message
        ai_text=reply,            # ← AI response
        mode=mode,
        execution_time=execution_time,
    )

    return ChatMessageResponse(
        reply=reply,
        session_id=session_id,
        execution_time=execution_time,
        status=status,
    )


@router.post("/sessions", response_model=ChatSessionResponse)
async def create_chat_session(body: CreateSessionRequest):
    """Create a new chat session in MongoDB and return its details."""
    doc = await _get_or_create_session(
        session_id=None,
        user_name=body.user_name or "Invex User",
        user_id=body.user_id,
    )
    return ChatSessionResponse(
        session_id=doc["session_id"],
        user_name=doc["user_name"],
        user_id=doc.get("user_id"),
        title=doc["title"],
        mode=doc.get("mode", "default"),
        created_at=doc["created_at"],
        last_message_at=doc["last_message_at"],
        message_count=len(doc.get("messages", [])),
        messages=doc.get("messages", []),
    )


@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_chat_session(session_id: str):
    """Fetch a full chat session including all messages from MongoDB."""
    doc = await get_mongo_db()["chat_sessions"].find_one(
        {"session_id": session_id}, {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    return ChatSessionResponse(
        session_id=doc["session_id"],
        user_name=doc["user_name"],
        user_id=doc.get("user_id"),
        title=doc["title"],
        mode=doc.get("mode", "default"),
        created_at=doc["created_at"],
        last_message_at=doc["last_message_at"],
        message_count=len(doc.get("messages", [])),
        messages=doc.get("messages", []),
    )


@router.get("/sessions", response_model=List[ChatSessionResponse])
async def list_chat_sessions(user_id: Optional[str] = None, limit: int = 30):
    """
    List recent sessions sorted by last activity.
    Pass ?user_id=<id> to filter by user.
    """
    query: Dict[str, Any] = {}
    if user_id:
        query["user_id"] = user_id

    cursor = (
        get_mongo_db()["chat_sessions"]
        .find(query, {"_id": 0})
        .sort("last_message_at", -1)
        .limit(limit)
    )
    docs = await cursor.to_list(length=limit)

    return [
        ChatSessionResponse(
            session_id=d["session_id"],
            user_name=d["user_name"],
            user_id=d.get("user_id"),
            title=d["title"],
            mode=d.get("mode", "default"),
            created_at=d["created_at"],
            last_message_at=d["last_message_at"],
            message_count=len(d.get("messages", [])),
            messages=d.get("messages", []),
        )
        for d in docs
    ]


@router.delete("/sessions/{session_id}")
async def delete_chat_session(session_id: str):
    """Permanently delete a chat session and all its messages from MongoDB."""
    result = await get_mongo_db()["chat_sessions"].delete_one({"session_id": session_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"deleted": True, "session_id": session_id}
