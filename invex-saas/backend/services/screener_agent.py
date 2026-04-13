import json
from typing import List, Dict, Any, Optional, TypedDict
from groq import AsyncGroq
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END
from config import get_settings
from services.screener_service import screener_service

settings = get_settings()

class ScreenerAgentState(TypedDict):
    query: str
    is_ambiguous: bool
    ambiguity_message: str
    filters: dict
    results: list
    attempt: int
    max_attempts: int

class ScreenerAgent:
    def __init__(self):
        self.groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        self.llm_fast = ChatGroq(model="llama-3.1-8b-instant", temperature=0)
        self.llm_deep = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.2)
        self.app = self._build_graph()

    def _build_graph(self):
        workflow = StateGraph(ScreenerAgentState)

        workflow.add_node("hitl_check", self._hitl_check)
        workflow.add_node("extract_filters", self._extract_filters)
        workflow.add_node("execute_screener", self._execute_screener)
        workflow.add_node("evaluate_coverage", self._evaluate_coverage)

        workflow.set_entry_point("hitl_check")

        def hitl_router(state: ScreenerAgentState):
            return "end" if state["is_ambiguous"] else "continue"

        workflow.add_conditional_edges(
            "hitl_check",
            hitl_router,
            {"end": END, "continue": "extract_filters"}
        )

        workflow.add_edge("extract_filters", "execute_screener")
        workflow.add_edge("execute_screener", "evaluate_coverage")

        def coverage_router(state: ScreenerAgentState):
            if len(state["results"]) > 0 or state["attempt"] >= state["max_attempts"]:
                return "end"
            return "relax_filters"

        workflow.add_conditional_edges(
            "evaluate_coverage",
            coverage_router,
            {"end": END, "relax_filters": "extract_filters"} # Loops back to reconsider filters based on attempt history
        )

        return workflow.compile()

    def _hitl_check(self, state: ScreenerAgentState):
        """Halts if the query is too ambiguous."""
        prompt = f"""
        Determine if the user's financial screener query is too vague to extract actionable metrics.
        Query: "{state['query']}"
        If it's just "show me good stocks", "best stocks", output exactly: AMBIGUOUS
        Otherwise output: CLEAR
        """
        response = self.llm_fast.invoke([HumanMessage(content=prompt)]).content.strip()
        if "AMBIGUOUS" in response:
            return {
                "is_ambiguous": True,
                "ambiguity_message": "Could you be more specific? For example, specify sectors, high momentum, low PE, or high ROE."
            }
        return {"is_ambiguous": False}

    def _extract_filters(self, state: ScreenerAgentState):
        """Parses natural language into JSON filters."""
        is_retry = state["attempt"] > 0
        relax_instruction = ""
        if is_retry:
            relax_instruction = """
            WARNING: The previous filters returned 0 results. 
            You MUST relax some 'soft constraints' like exact P/E ratios, RSI thresholds, 
            or market cap boundaries. Keep the original intent but broaden the scope.
            """

        sys_prompt = f"""
        Extract financial filters from the user query into a strict JSON object. 
        Supported keys: sector (string), min_pe (float), max_pe (float), min_market_cap (float), max_market_cap (float), 
        min_roe (float), min_roce (float), max_debt_equity (float), min_eps_growth (float), min_rsi (float), max_rsi (float),
        volume_spike (bool), wk52_high_breakout (bool), above_dma_50 (bool), above_dma_200 (bool), sort_by (string), sort_desc (bool).
        {relax_instruction}
        Output ONLY valid JSON. No markdown formatting.
        """
        response = self.llm_fast.invoke([
            SystemMessage(content=sys_prompt),
            HumanMessage(content=state['query'])
        ]).content.strip()
        
        try:
            # Strip markdown if present
            if response.startswith("```json"):
                response = response[7:-3]
            elif response.startswith("```"):
                response = response[3:-3]
            
            filters = json.loads(response)
        except Exception:
            filters = {}

        return {"filters": filters}

    def _execute_screener(self, state: ScreenerAgentState):
        """Runs the mock DB screener with current filters."""
        results = screener_service.screen_assets(state["filters"])
        return {"results": results}

    def _evaluate_coverage(self, state: ScreenerAgentState):
        """Increments attempt counter so the graph can loop/relax if 0 results."""
        return {"attempt": state["attempt"] + 1}

    async def run_assistant(self, query: str) -> dict:
        initial_state = {
            "query": query,
            "is_ambiguous": False,
            "ambiguity_message": "",
            "filters": {},
            "results": [],
            "attempt": 0,
            "max_attempts": 3
        }
        
        out_state = await self.app.ainvoke(initial_state)
        
        return {
            "is_ambiguous": out_state.get("is_ambiguous", False),
            "message": out_state.get("ambiguity_message", ""),
            "filters": out_state.get("filters", {}),
            "results": out_state.get("results", [])
        }

    async def generate_insights(self, symbols: List[str]) -> str:
        if not symbols:
            return ""
        
        # Get actual mock data to ground the LLM
        all_data = screener_service.cached_results
        target_data = [d for d in all_data if d["symbol"] in symbols]
        
        context = json.dumps(target_data, indent=2)
        
        sys_prompt = """
        You are a top-tier institutional financial analyst. 
        Write a hyper-concise, high-quality explanation of WHY these specific stocks are highlighted and what makes them potentially attractive based on their metrics (Momentum, Fundamentals, Valuation).
        Make your insights directly reference the metrics in the data provided. Avoid generic fluff.
        Keep it under 3-4 sentences total.
        """
        
        try:
            completion = await self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": f"Stocks Data: {context}"}
                ],
                temperature=0.2,
                max_tokens=256
            )
            return completion.choices[0].message.content.strip()
        except Exception as e:
            return f"Failed to generate insights: {str(e)}"
