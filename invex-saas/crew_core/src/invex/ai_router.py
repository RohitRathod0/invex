import logging
import asyncio
from typing import Dict, Any, Optional
from pydantic import BaseModel

logger = logging.getLogger("invex.ai_router")

class ExecutionMode:
    AUTO = "auto"
    FAST = "fast"
    DEEP = "deep"
    CHAT = "chat"

class AnalysisRequest(BaseModel):
    capital_amount: float = 0.0
    risk_percentage: int = 50
    risk_tolerance: str = "moderate"
    expected_returns: float = 15.0
    investment_horizon: str = "5 years"
    duration_years: int = 5
    asset_preferences: Dict[str, bool] = {}
    user_question: Optional[str] = None
    topic: Optional[str] = None
    execution_mode: str = "auto"

    class Config:
        extra = "allow"

class InvexAIRouter:
    """
    Intelligent router that selects between Execution Modes:
    - FAST: LangGraph (<30s)
    - DEEP: CrewAI (2-5min)
    - CHAT: Direct LLM (<5s)
    """
    
    def __init__(self):
        # Lazy load to prevent circular imports or heavy initializations
        from .engines.deep_engine import DeepEngine
        from .engines.fast_engine import FastEngine
        
        self.deep_engine = DeepEngine()
        self.fast_engine = FastEngine()
        
        # Chat left unimplemented initially, stubbed out below
        self.chat_engine = None

    async def analyze(self, request: AnalysisRequest) -> Dict[str, Any]:
        mode = self._determine_mode(request)
        logger.info(f"AI Router selected execution mode: {mode.upper()}")
        
        # Convert Pydantic request to Dict for backward compatibility with prompts
        inputs = request.model_dump()
        
        if mode == ExecutionMode.DEEP:
            return await self.deep_engine.run(inputs)
            
        elif mode == ExecutionMode.FAST:
            if not self.fast_engine:
                # Fallback if fast_engine isn't wired up yet
                logger.warning("FAST mode requested but engine not implemented. Falling back to DEEP.")
                return await self.deep_engine.run(inputs)
            return await self.fast_engine.run(inputs)
            
        elif mode == ExecutionMode.CHAT:
            if not self.chat_engine:
                from .engines.chat_engine import ChatEngine
                self.chat_engine = ChatEngine()
            return await self.chat_engine.run(inputs)

    def _determine_mode(self, request: AnalysisRequest) -> str:
        """Logic to decide which engine to use if set to AUTO"""
        if request.execution_mode and request.execution_mode != ExecutionMode.AUTO:
            return request.execution_mode.lower()

        topic = request.topic or request.user_question or ""

        # If no capital provided (user is just chatting), use CHAT.
        if not request.capital_amount or request.capital_amount == 0:
            return ExecutionMode.CHAT

        # If user is asking a short conversational question without portfolio intent
        is_basic_question = len(topic.split()) < 15 and "portfolio" not in topic.lower() and "invest" not in topic.lower()
        if is_basic_question and topic:
            return ExecutionMode.CHAT

        # DEEP for ≥ ₹1L (full CrewAI analysis). FAST for smaller amounts.
        if request.capital_amount < 100_000:
            return ExecutionMode.FAST

        return ExecutionMode.DEEP



# Backward compatibility wrapper for old code: `crew = Invex()` -> `crew = InvexV2()`
class InvexV2(InvexAIRouter):
    def __init__(self):
        super().__init__()
        self.user_preferences = {}

    def kickoff(self, inputs: Dict[str, Any]) -> str:
        """Synchronous wrapper for legacy compatibility"""
        result = asyncio.run(self.kickoff_async(inputs))
        return result.get('result', {}).get('report', str(result))

    async def kickoff_async(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Provides metadata-rich result"""
        request = AnalysisRequest(**inputs)
        
        # Override with explicit preferences if directly set on class
        if self.user_preferences:
            request.asset_preferences = self.user_preferences
            
        return await self.analyze(request)
