from fastapi import APIRouter, Request, Query
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter(prefix="/research", tags=["research"])
limiter = Limiter(key_func=get_remote_address)

class ResearchQuery(BaseModel):
    question: str
    symbol: str = None

@router.post("/query")
@limiter.limit("20/minute")
async def query_research_assistant(request: Request, query: ResearchQuery):
    from services.research_assistant import AIResearchAssistant
    
    assistant = AIResearchAssistant()
    result = await assistant.query(query.question, query.symbol)
    
    return result
