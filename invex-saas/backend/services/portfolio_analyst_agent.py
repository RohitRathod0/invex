import os
import logging
from typing import TypedDict, Dict, Any, List, Optional
from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage

from config import get_settings
from services.news_service import MarketNewsTool

logger = logging.getLogger(__name__)
settings = get_settings()

class PortfolioAnalystState(TypedDict):
    """State for the Portfolio Analyst Agent."""
    query: str
    chat_history: List[Dict[str, str]]
    portfolio_context: str
    news_data: str
    analysis: str
    is_complete: bool
    feedback: str
    attempt: int
    max_attempts: int

class PortfolioAnalystAgent:
    def __init__(self):
        groq_key = settings.GROQ_API_KEY or os.environ.get("GROQ_API_KEY")

        # Fast/lightweight model — used for evaluation step (low token spend)
        self.fast_llm = ChatGroq(
            model="llama-3.1-8b-instant",
            api_key=groq_key,
            temperature=0,
        )

        # Primary model — used for the main analysis (better reasoning)
        _primary = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=groq_key,
            temperature=0.2,
        )
        # Fallback: if primary hits rate/token limit, drop to fast model
        self.primary_llm = _primary.with_fallbacks([self.fast_llm])

        self.eval_llm = self.fast_llm
        
        # Tools
        self.news_tool = MarketNewsTool()
        
        # Build the LangGraph
        self.app = self._build_graph()

    def _build_graph(self):
        workflow = StateGraph(PortfolioAnalystState)
        
        workflow.add_node("fetch_context", self._fetch_context)
        workflow.add_node("analyze_impact", self._analyze_impact)
        workflow.add_node("evaluate", self._evaluate)
        workflow.add_node("fallback_analysis", self._fallback_analysis)
        
        workflow.set_entry_point("fetch_context")
        workflow.add_edge("fetch_context", "analyze_impact")
        workflow.add_edge("analyze_impact", "evaluate")
        
        def router(state: PortfolioAnalystState):
            if state.get("is_complete"):
                return "end"
            elif state.get("attempt", 0) >= state.get("max_attempts", 3):
                return "fallback"
            else:
                return "retry"
                
        workflow.add_conditional_edges(
            "evaluate",
            router,
            {
                "end": END,
                "retry": "analyze_impact",
                "fallback": "fallback_analysis"
            }
        )
        
        workflow.add_edge("fallback_analysis", END)
        return workflow.compile()

    def _fetch_context(self, state: PortfolioAnalystState):
        """Fetches live news ONLY if news_data is not already provided (e.g. from @ citation).
        Skipping the fetch avoids 50+ sequential RSS+yfinance calls for every chat turn.
        LangGraph runs sync nodes in a thread pool automatically, so _run() is safe here.
        """
        news_data = state.get("news_data", "")
        if news_data:
            # Already has context — cited news item from frontend, no re-fetch needed
            return {"news_data": news_data, "attempt": state.get("attempt", 0) + 1}
        
        try:
            news_data = self.news_tool._run()
        except Exception as e:
            logger.error(f"Failed to fetch news: {str(e)}")
            news_data = "Unable to fetch live news. Proceed based on user query and portfolio context only."
                
        return {"news_data": news_data, "attempt": state.get("attempt", 0) + 1}


    def _analyze_impact(self, state: PortfolioAnalystState):
        """Generates the primary personalized impact report based on news and portfolio context."""
        query = state.get("query", "Analyze the impact of today's news on my portfolio.")
        portfolio = state.get("portfolio_context", "Cash / No holdings.")
        news = state.get("news_data", "No news provided.")
        history = state.get("chat_history", [])
        feedback = state.get("feedback", "")
        
        system_prompt = """
        You are a highly capable AI Portfolio Analyst. Your job is to read today's market news 
        and the user's specific portfolio holdings, and determine EXACTLY how the news impacts their positions.
        If the user asks follow-up questions, use the conversation history to maintain context.
        
        Keep it analytical, objective, and dense. DO NOT USE FLUFF.
        """
        
        if feedback:
            system_prompt += f"\nPREVIOUS EVALUATOR FEEDBACK: {feedback}\nAddress this in your new response."
            
        messages = [SystemMessage(content=system_prompt)]
        
        # Inject portfolio and news context inside the system message or as first message
        context_msg = f"Portfolio Holdings:\n{portfolio}\n\nToday's News:\n{news}"
        messages.append(SystemMessage(content=context_msg))
        
        # Inject chat history
        for msg in history:
            role = msg.get("role", "")
            content = msg.get("content", "")
            if role == "user":
                messages.append(HumanMessage(content=content))
            elif role == "assistant":
                messages.append(SystemMessage(content=f"Assistant: {content}"))
                
        # Inject current query
        messages.append(HumanMessage(content=query))
        
        try:
            res = self.primary_llm.invoke(messages)
            analysis = res.content.strip()
        except Exception as e:
            logger.error(f"Error in analyze_impact: {str(e)}")
            analysis = f"Analysis generation failed due to API error: {str(e)}"
            
        return {"analysis": analysis}

    def _evaluate(self, state: PortfolioAnalystState):
        """Evaluates whether the analysis satisfactorily addresses the news, portfolio context, and the query."""
        from langchain_core.output_parsers import JsonOutputParser
        from pydantic import BaseModel, Field
        
        class EvalResult(BaseModel):
            is_complete: bool = Field(description="Are all user's questions or holdings addressed regarding the news?")
            feedback: str = Field(description="If incomplete, provide precise instruction on what is missing.")
            
        parser = JsonOutputParser(pydantic_object=EvalResult)
        
        sys_prompt = (
            "You are an evaluator assessing a portfolio analyst's response. \n"
            f"Format requirements: {parser.get_format_instructions()}\n"
            "Does the 'Analysis' answer the user's query adequately based on the 'News' or 'Conversation History'? \n"
            "If it is highly generic or hallucinating, set is_complete=false and provide feedback."
        )
        
        user_prompt = (
            f"Query: {state.get('query')}\n"
            f"Analysis: {state.get('analysis')}\n"
        )
        
        try:
            res = self.eval_llm.invoke([
                SystemMessage(content=sys_prompt),
                HumanMessage(content=user_prompt)
            ])
            parsed = parser.parse(res.content.strip())
            is_comp = parsed.get("is_complete", False)
            feed = parsed.get("feedback", "")
        except Exception as e:
            logger.warning(f"Evaluation parse failed, falling back to complete. Error: {str(e)}")
            is_comp = True
            feed = ""
            
        return {"is_complete": is_comp, "feedback": feed, "attempt": state.get("attempt", 0) + 1}

    def _fallback_analysis(self, state: PortfolioAnalystState):
        """Failsafe simple response mechanism if standard analysis routing fails."""
        safe_response = (
            "### Standard Analysis Unavailable\n"
            "We were unable to generate a highly verified response due to service constraints. "
            "However, based on standard market behavior, maintain a diversified portfolio and review allocations "
            "if high volatility is expected. Please try again shortly."
        )
        return {"analysis": state.get("analysis", "") + "\n\n" + safe_response, "is_complete": True}

    async def run_analyst(
        self,
        user_query: str,
        portfolio_context: str,
        chat_history: List[Dict[str, str]] = None,
        news_data: str = None,
        max_attempts: int = 3
    ) -> Dict[str, Any]:
        """Entry point for the REST API endpoint.
        
        Args:
            news_data: Pre-fetched news text (e.g. from frontend @ citation).
                       When provided, skips the expensive RSS+yfinance fetch entirely.
        """
        init_state = {
            "query": user_query,
            "chat_history": chat_history or [],
            "portfolio_context": portfolio_context,
            "news_data": news_data or "",  # Empty string → fetch; non-empty → skip fetch
            "analysis": "",
            "is_complete": False,
            "feedback": "",
            "attempt": 0,
            "max_attempts": max_attempts
        }
        
        final_state = await self.app.ainvoke(init_state)
        
        return {
            "analysis": final_state.get("analysis", ""),
            "is_complete": final_state.get("is_complete", False),
            "attempts": final_state.get("attempt", 1)
        }

# Singleton instance
portfolio_analyst = PortfolioAnalystAgent()
