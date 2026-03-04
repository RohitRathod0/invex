from fastapi import APIRouter, HTTPException
from models.api_models import CreateSessionRequest, Session, SessionListResponse
from services.session_service import session_service

router = APIRouter(prefix="/sessions", tags=["sessions"])

@router.post("/", response_model=Session)
async def create_new_session(request: CreateSessionRequest):
    """Creates a new chat session."""
    return await session_service.create_session(request.user_name)

@router.get("/{session_id}", response_model=Session)
async def get_session_by_id(session_id: str):
    """Retrieves a session by ID including message history."""
    session = await session_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.get("/", response_model=SessionListResponse)
async def list_all_sessions(limit: int = 20, offset: int = 0):
    """Lists recent sessions (mock implementation for MVP)."""
    # In a real app, implement scan/query with pagination
    return {"sessions": [], "total": 0}

@router.delete("/{session_id}")
async def delete_session_by_id(session_id: str):
    """Deletes a session."""
    # MVP: Not fully implemented in service yet
    return {"deleted": True, "session_id": session_id}
