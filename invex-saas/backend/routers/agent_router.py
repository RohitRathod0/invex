from fastapi import APIRouter, HTTPException
from models.api_models import RunAgentRequest
from services.crew_service import run_crew_agent

router = APIRouter(prefix="/agents", tags=["agents"])

@router.post("/run")
async def run_crew_agent_endpoint(request: RunAgentRequest):
    """
    Trigger a CrewAI crew run with a user message.
    """
    # For MVP, we run synchronously (awaited) but utilizing asyncio.to_thread in service
    result = await run_crew_agent(request.message, request.session_id, request.inputs)
    
    if result["status"] == "failed":
        # We might still return 200 with error info, or 500 depending on client expectation
        # JSON spec says: "error": "string or null" in response
        return result
        
    return result

@router.get("/runs/{run_id}")
async def get_agent_run_by_id(run_id: str):
    return {"run_id": run_id, "status": "unknown", "result": None}
