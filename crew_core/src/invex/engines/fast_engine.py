import time
import logging
from typing import Dict, Any, TypedDict, Literal
from datetime import datetime

from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph, START, END

from invex.schemas import PortfolioReport
from invex.tools import TopStocksTool, MutualFundTool, GoldPriceTool, CryptoPriceTool, IndiaGDPTool

logger = logging.getLogger("invex.fast_engine")

class EngineState(TypedDict):
    inputs: Dict[str, Any]
    market_data: str
    report_dict: Dict[str, Any]
    report_str: str
    error: str

# ── Node 1: Gather Data ──────────────────────────────────────────────────────
async def gather_data_node(state: EngineState) -> Dict[str, Any]:
    logger.info("LangGraph Node: Gathering Market Data")
    inputs = state["inputs"]
    prefs = inputs.get("asset_preferences", {})

    gathered_data = f"Current Date: {datetime.now().strftime('%Y-%m-%d')}\n\n"

    try:
        # Economic context — no args needed
        gathered_data += IndiaGDPTool()._run() + "\n\n"

        if prefs.get("stocks", True):
            gathered_data += "--- STOCK DATA ---\n"
            # Fix: pass required category arg; use "high_performers" for 100+ stock scan
            gathered_data += TopStocksTool()._run("high_performers") + "\n\n"

        if prefs.get("mutual_funds", True):
            gathered_data += "--- MUTUAL FUNDS ---\n"
            # Fix: pass required fund_name arg
            gathered_data += MutualFundTool()._run("large cap") + "\n\n"

        if prefs.get("gold", True):
            gathered_data += "--- GOLD DATA ---\n"
            gathered_data += GoldPriceTool()._run() + "\n\n"

        if prefs.get("crypto", False):
            gathered_data += "--- CRYPTO DATA ---\n"
            gathered_data += CryptoPriceTool()._run("bitcoin") + "\n\n"

    except Exception as e:
        logger.error(f"Error gathering data: {e}")
        gathered_data += f"Error fetching live data: {e}. Fallback to estimations.\n"

    return {"market_data": gathered_data, "error": ""}


# ── Node 2: Generate Portfolio ────────────────────────────────────────────────
async def generation_node(state: EngineState) -> Dict[str, Any]:
    logger.info("LangGraph Node: Generating Portfolio")
    inputs = state["inputs"]
    market_data = state["market_data"]

    # Fast engine uses LangGraph + LangChain directly (not CrewAI/LiteLLM).
    # Mistral is now PRIMARY for all analysis — stable paid quota.
    # Gemini kept as fallback in case Mistral hits limits.
    from langchain_mistralai import ChatMistralAI
    import os
    _primary_llm = ChatMistralAI(
        model="mistral-large-latest",
        api_key=os.environ.get("MISTRAL_API_KEY"),
        temperature=0.2,
        max_tokens=8192,
    )
    _fallback_llm = ChatMistralAI(
        model="mistral-small-latest",
        api_key=os.environ.get("MISTRAL_API_KEY"),
        temperature=0.2,
        max_tokens=4096,
    )
    llm = _primary_llm.with_fallbacks([_fallback_llm])
    structured_llm = llm.with_structured_output(PortfolioReport)

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a professional wealth manager for the Indian market. Generate a robust, realistic, and highly structured portfolio report. IMPORTANT: You must return the entire report as a SINGLE function/tool call. Do NOT return multiple separate tool calls."),
        ("human", """Generate a portfolio report based on the following parameters:
        - Capital Amount: {capital_amount}
        - Risk Percentage: {risk_percentage}% ({risk_tolerance})
        - Prefer Stocks: {stocks}, Mutual Funds: {mutual_funds}, Gold: {gold}, Crypto: {crypto}

        Use the following live market data to back your recommendations:
        {market_data}

        Be highly analytical. Only include assets where the preference is True.
        Assign realistic prices (use the live data), calculate diversification scores, and offer distinct reasons for each asset.
        """)
    ])

    prefs = inputs.get("asset_preferences", {})
    chain = prompt | structured_llm

    try:
        report: PortfolioReport = await chain.ainvoke({
            "capital_amount": inputs.get("capital_amount", 100000),
            "risk_percentage": inputs.get("risk_percentage", 50),
            "risk_tolerance": inputs.get("risk_tolerance", "moderate"),
            "stocks": prefs.get("stocks", True),
            "mutual_funds": prefs.get("mutual_funds", True),
            "gold": prefs.get("gold", True),
            "crypto": prefs.get("crypto", False),
            "market_data": market_data
        })

        report_str = f"## Fast Report Generated on {report.generated_date}\n\n"
        report_str += f"**Portfolio Capital:** ₹{report.total_capital:,.2f}\n"
        report_str += f"**Context:** {report.macro_context}\n\n### Recommendations:\n"

        for rec in report.recommendations:
            report_str += f"- **{rec.symbol}** ({rec.action}): Target ₹{rec.target_price:,.2f} [Allocation: {rec.allocation_percentage}%]\n"

        return {"report_dict": report.model_dump(), "report_str": report_str, "error": ""}

    except Exception as e:
        logger.error(f"Generation failed: {e}")
        return {"report_dict": None, "report_str": f"Engine failed at generation: {e}", "error": str(e)}


# ── Node 3: Fallback ──────────────────────────────────────────────────────────
async def fallback_node(state: EngineState) -> Dict[str, Any]:
    logger.warning("LangGraph Node: Fallback — no market data returned")
    return {
        "report_dict": None,
        "report_str": "Could not fetch market data. Please retry or check your API connectivity.",
        "error": "no_market_data"
    }


# ── Conditional edge: retry or fallback ───────────────────────────────────────
def route_after_gather(state: EngineState) -> Literal["generate", "fallback"]:
    if state.get("market_data") and len(state["market_data"]) > 100:
        return "generate"
    return "fallback"


# ── Build the Graph ───────────────────────────────────────────────────────────
workflow = StateGraph(EngineState)
workflow.add_node("gather_data", gather_data_node)
workflow.add_node("generate", generation_node)
workflow.add_node("fallback", fallback_node)

workflow.add_edge(START, "gather_data")
workflow.add_conditional_edges("gather_data", route_after_gather)
workflow.add_edge("generate", END)
workflow.add_edge("fallback", END)

fast_graph = workflow.compile()


class FastEngine:
    """
    High-speed LangGraph implementation mapping existing Tools into a graph.
    Returns structured recommendations in 10-30s.
    Conditional edge: if market data fetch fails → fallback node.
    """
    async def run(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        start = time.time()
        logger.info("Initiating LangGraph FAST Mode")

        try:
            result = await fast_graph.ainvoke({
                "inputs": inputs,
                "market_data": "",
                "report_dict": None,
                "report_str": "",
                "error": ""
            })

            return {
                "mode": "fast",
                "execution_time": round(time.time() - start, 2),
                "result": {
                    "report": result.get("report_str", ""),
                    "structured_data": result.get("report_dict")
                },
                "status": "success" if result.get("report_dict") else "failed",
                "error": None if result.get("report_dict") else result.get("report_str")
            }
        except Exception as e:
            logger.error(f"FAST Graph failed: {e}")
            return {
                "mode": "fast",
                "execution_time": round(time.time() - start, 2),
                "result": {
                    "report": f"Error: {e}",
                    "structured_data": None
                },
                "status": "failed",
                "error": str(e)
            }
