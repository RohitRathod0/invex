import time
import logging
from typing import Dict, Any, AsyncIterator

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver

from invex.tools import (
    StockPriceTool, TopStocksTool, MutualFundTool,
    GoldPriceTool, CryptoPriceTool, TopCryptosTool,
    IndiaGDPTool, IndiaCPITool
)

logger = logging.getLogger("invex.chat_engine")

# ── LangChain @tool wrappers (create_react_agent requires plain callables) ────
@tool
def get_stock_price(symbol: str) -> str:
    """Fetches real-time NSE/BSE stock data including price, PE ratio, market cap, and fundamentals. Pass the Yahoo Finance symbol e.g. 'RELIANCE.NS', 'AAPL' for US stocks."""
    return StockPriceTool()._run(symbol)

@tool
def get_top_stocks(category: str = "high_performers") -> str:
    """Gets highest performing Indian stocks from a 100+ stock NSE universe, filtered by 52-week returns, profitability and liquidity."""
    return TopStocksTool()._run(category)

@tool
def get_mutual_fund_data(fund_name: str) -> str:
    """Fetches live mutual fund NAV and performance data from mfapi.in. Pass a fund name e.g. 'HDFC Top 100' or 'large cap'."""
    return MutualFundTool()._run(fund_name)

@tool
def get_gold_price() -> str:
    """Fetches current gold price in INR using GOLDBEES ETF as proxy."""
    return GoldPriceTool()._run()

@tool
def get_crypto_price(crypto_id: str) -> str:
    """Fetches a specific cryptocurrency price in INR. Pass the CoinGecko id e.g. 'bitcoin', 'ethereum', 'solana'."""
    return CryptoPriceTool()._run(crypto_id)

@tool
def get_top_cryptos() -> str:
    """Gets the top 5 cryptocurrencies by market cap with current INR prices and 24h change."""
    return TopCryptosTool()._run()

@tool
def get_india_gdp() -> str:
    """Fetches India's latest GDP growth rate from World Bank data."""
    return IndiaGDPTool()._run()

@tool
def get_india_cpi() -> str:
    """Fetches India's latest CPI inflation rate from World Bank data."""
    return IndiaCPITool()._run()


# Single in-process memory store — persists across requests within the server lifetime
_memory = MemorySaver()

AGENT_TOOLS = [
    get_stock_price,
    get_top_stocks,
    get_mutual_fund_data,
    get_gold_price,
    get_crypto_price,
    get_top_cryptos,
    get_india_gdp,
    get_india_cpi,
]


class ChatEngine:
    """
    LangGraph ReAct agent for conversational stock and market queries.
    - Uses MemorySaver so each thread (session_id) retains full conversation history.
    - Tools provide live financial data (stocks, crypto, MF, gold, macro).
    """

    def __init__(self):
        self.llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.5)
        self.agent_executor = create_react_agent(
            self.llm,
            AGENT_TOOLS,
            checkpointer=_memory
        )

    def _build_system_message(self, inputs: Dict[str, Any]) -> str:
        context_parts = []

        capital = inputs.get("capital_amount")
        risk = inputs.get("risk_tolerance")
        if capital and float(capital) > 0 and risk:
            context_parts.append(
                f"The user has a portfolio of ₹{float(capital):,.0f} with a {risk} risk tolerance."
            )

        asset_prefs = inputs.get("asset_preferences", {})
        if asset_prefs:
            enabled = [k for k, v in asset_prefs.items() if v]
            if enabled:
                context_parts.append(f"Their preferred asset classes are: {', '.join(enabled)}.")

        context_str = " ".join(context_parts)

        return (
            "You are Invex AI, a professional wealth manager and market analyst. "
            "You have live tools to fetch Indian and global stock prices, crypto, mutual funds, gold, and macro data. "
            f"{context_str} "
            "Always use tools to fetch real prices — never guess or assume a number. "
            "Be concise and format answers in clean Markdown with ₹ for Indian currency. "
            "If asked about projections or opinions, back them with data from your tools."
        )

    async def run(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        start = time.time()
        logger.info("Starting LangGraph CHAT mode (with memory)...")

        question = inputs.get("topic") or inputs.get("user_question") or "Hello!"
        session_id = inputs.get("session_id", "default-session")

        system_message = self._build_system_message(inputs)

        # thread_id scopes the MemorySaver to this user's session
        config = {"configurable": {"thread_id": session_id}}

        try:
            result = await self.agent_executor.ainvoke(
                {
                    "messages": [
                        SystemMessage(content=system_message),
                        HumanMessage(content=question)
                    ]
                },
                config=config
            )

            final_message = result["messages"][-1].content

            return {
                "mode": "chat",
                "execution_time": round(time.time() - start, 2),
                "result": {
                    "report": final_message,
                    "structured_data": None
                },
                "status": "success",
                "error": None
            }

        except Exception as e:
            logger.error(f"CHAT Engine LangGraph failed: {e}")
            return {
                "mode": "chat",
                "execution_time": round(time.time() - start, 2),
                "result": {
                    "report": f"I'm sorry, I encountered an error: {str(e)}",
                    "structured_data": None
                },
                "status": "failed",
                "error": str(e)
            }
