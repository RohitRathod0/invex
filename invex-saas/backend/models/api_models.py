from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# Shared
class Session(BaseModel):
    session_id: str
    user_name: Optional[str] = "Anonymous"
    created_at: str
    status: str = "active"
    messages: List[Dict[str, Any]] = []

class AgentRun(BaseModel):
    run_id: str
    session_id: str
    status: str
    result: Optional[str] = None
    error: Optional[str] = None
    created_at: str
    duration_ms: Optional[int] = 0

# Requests
class CreateSessionRequest(BaseModel):
    user_name: Optional[str] = "Anonymous"

class RunAgentRequest(BaseModel):
    session_id: str
    message: str
    inputs: Optional[Dict[str, Any]] = None
    stream: bool = False

class UploadDocumentRequest(BaseModel):
    pass # File upload handled via Form/File

# Responses
class HealthResponse(BaseModel):
    status: str
    version: str
    uptime_seconds: float

class AwsStatusResponse(BaseModel):
    s3: bool
    dynamodb: bool
    bedrock: bool

class SessionListResponse(BaseModel):
    sessions: List[Session]
    total: int
