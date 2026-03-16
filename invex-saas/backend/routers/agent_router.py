from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from models.api_models import RunAgentRequest
from services.crew_service import run_crew_agent

router = APIRouter(prefix="/agents", tags=["agents"])
limiter = Limiter(key_func=get_remote_address)

@router.post("/run")
@limiter.limit("3/hour")
async def run_crew_agent_endpoint(request: Request, body: RunAgentRequest):
    """
    Trigger a CrewAI crew run with a user message.
    Rate limited: 3 AI report generations per hour per IP.
    """
    result = await run_crew_agent(body.message, body.session_id, body.inputs)
    
    if result["status"] == "failed":
        return result
        
    return result

@router.get("/runs/{run_id}")
async def get_agent_run_by_id(run_id: str):
    return {"run_id": run_id, "status": "unknown", "result": None}
