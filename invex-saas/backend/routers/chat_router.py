import time
import sys
import os
import uuid
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any

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


# ── Request / Response models ─────────────────────────────────────────────────
class ChatMessageRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = {}


class ChatMessageResponse(BaseModel):
    reply: str
    session_id: str
    execution_time: float
    status: str


# ── Endpoint ──────────────────────────────────────────────────────────────────
@router.post("/message", response_model=ChatMessageResponse)
async def chat_message(body: ChatMessageRequest):
    """
    Direct LangGraph ChatEngine endpoint for the /chat page.
    Bypasses CrewAI entirely — fast (<5s), conversational, memory-enabled.
    """
    session_id = body.session_id or str(uuid.uuid4())

    try:
        engine = get_chat_engine()
        result = await engine.run({
            "topic": body.message,
            "session_id": session_id,
            **(body.context or {}),
        })

        reply = (
            result.get("result", {}).get("report")
            or result.get("result", {}).get("structured_data")
            or "I'm sorry, I couldn't generate a response."
        )

        return ChatMessageResponse(
            reply=str(reply),
            session_id=session_id,
            execution_time=result.get("execution_time", 0.0),
            status=result.get("status", "success"),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
