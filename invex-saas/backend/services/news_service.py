"""
News crew service: fetches geo-political / banking news and produces
BUY/SELL/HOLD signals for Indian market assets.

Uses the same Groq LLM as the main crew.
No external news API key needed — uses web scraping via yfinance news
and a curated RSS feed fallback.
"""

import os
import sys
import json
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Load crew_core/.env so GROQ_API_KEY and MODEL are set before any import
# ---------------------------------------------------------------------------
_script_dir = Path(__file__).resolve().parent
_env_path = _script_dir.parent.parent.parent / "crew_core" / ".env"
if _env_path.exists():
    load_dotenv(str(_env_path), override=True)

# Add crew_core/src to path for Invex imports
_crew_src = str(_script_dir.parent.parent.parent / "crew_core" / "src")
if _crew_src not in sys.path:
    sys.path.insert(0, _crew_src)

from crewai import Agent, Crew, Process, Task, LLM
from crewai.tools import BaseTool
from pydantic import Field
import yfinance as yf
import feedparser


def _get_llm():
    model = os.environ.get("MODEL", "groq/llama-3.1-8b-instant")
    return LLM(model=model)


# ---------------------------------------------------------------------------
# News Fetching Tool
# ---------------------------------------------------------------------------
class MarketNewsTool(BaseTool):
    name: str = "Market News Fetcher"
    description: str = (
        "Fetches latest high-impact global financial and geo-political news. "
        "Returns summarized headlines with sources covering: war/conflicts, "
        "central bank decisions, major banker statements, tech earnings."
    )

    def _run(self) -> str:
        news_items = []

        # 1. yfinance news for major indices/commodities
        tickers_to_check = ["^GSPC", "GC=F", "BTC-USD", "^NSEI"]
        for sym in tickers_to_check:
            try:
                t = yf.Ticker(sym)
                news = t.news or []
                for article in news[:3]:
                    title = article.get("title", "")
                    publisher = article.get("publisher", "")
                    if title:
                        news_items.append(f"[{publisher}] {title}")
            except Exception:
                pass

        # 2. Google News RSS for geopolitics + finance
        rss_feeds = [
            ("https://news.google.com/rss/search?q=geopolitics+market+impact&hl=en&gl=US&ceid=US:en", "Google News"),
            ("https://feeds.bbci.co.uk/news/business/rss.xml", "BBC Business"),
        ]
        for url, source in rss_feeds:
            try:
                feed = feedparser.parse(url)
                for entry in feed.entries[:5]:
                    title = entry.get("title", "")
                    if title:
                        news_items.append(f"[{source}] {title}")
            except Exception:
                pass

        if not news_items:
            return "No live news available. Analyze based on recent known events."

        unique_items = list(dict.fromkeys(news_items))[:20]
        return "\n".join(f"{i+1}. {item}" for i, item in enumerate(unique_items))


# ---------------------------------------------------------------------------
# News Crew
# ---------------------------------------------------------------------------
def run_news_analysis() -> dict:
    """
    Run a 2-agent crew:
      1. news_fetcher — fetches and summarizes market-moving news
      2. market_decision_agent — converts news into BUY/SELL/HOLD signals
    """
    run_id = f"news_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    try:
        llm = _get_llm()

        # Agent 1: News Fetcher
        news_fetcher = Agent(
            role="Global News Intelligence Analyst",
            goal=(
                "Fetch today's most market-relevant news — geo-political conflicts, "
                "central bank statements, major CEO/banker quotes — and summarize each in 2-3 sentences."
            ),
            backstory=(
                "Former Bloomberg analyst specializing in market-moving signals from global news. "
                "You focus on: wars, sanctions, Fed/RBI decisions, Jamie Dimon/Goldman Sachs statements, "
                "OPEC decisions, and big tech earnings. You are concise and factual."
            ),
            tools=[MarketNewsTool()],
            llm=llm,
            verbose=True,
            max_iter=5,
        )

        # Agent 2: Market Decision Agent
        decision_agent = Agent(
            role="Market Impact Strategist",
            goal=(
                "Analyze news summaries and issue clear BUY/SELL/HOLD signals for "
                "Indian stocks, gold, mutual funds, and crypto with brief reasoning."
            ),
            backstory=(
                "Quantitative strategist from Goldman Sachs India. You understand how global events "
                "flow to Indian markets: Fed hikes → Nifty drop, Middle East war → gold spike, "
                "banking crisis → crypto volatility, US tech earnings → Indian IT stocks. "
                "You issue direct, actionable signals — no vague disclaimers."
            ),
            llm=llm,
            verbose=True,
            max_iter=5,
        )

        # Task 1: Fetch news
        fetch_task = Task(
            description=(
                "Use the Market News Fetcher tool to get today's news. "
                "Summarize the top 5-8 most market-relevant items. "
                "For each: (a) headline, (b) 2-sentence summary, (c) which markets it could affect. "
                f"Today's date: {datetime.now().strftime('%Y-%m-%d')}"
            ),
            expected_output=(
                "Numbered list of 5-8 news summaries, each with: "
                "Headline | Summary | Markets affected (Stocks/Gold/Crypto/Bonds)"
            ),
            agent=news_fetcher,
        )

        # Task 2: Issue signals
        decision_task = Task(
            description=(
                "Review the news summaries from the previous task. "
                "For each major event, assess: "
                "(1) Impact on Indian Stocks (Nifty/specific sectors): Positive/Negative/Neutral + magnitude "
                "(2) Impact on Gold: Positive/Negative/Neutral "
                "(3) Impact on Crypto: Positive/Negative/Neutral "
                "(4) Impact on Mutual Funds: Positive/Negative/Neutral "
                "Then issue an OVERALL PORTFOLIO SIGNAL: "
                "- BULLISH / BEARISH / NEUTRAL "
                "- Top 3 specific actionable recommendations (BUY/SELL/HOLD with asset name) "
                "- Risk level today: LOW / MEDIUM / HIGH "
                "- Timeframe: short-term (1-7 days) view"
            ),
            expected_output=(
                "## Market News Analysis\n"
                "**Date:** [date] | **Risk Level:** [LOW/MEDIUM/HIGH]\n\n"
                "### Key Events & Market Impact\n"
                "[For each event: Event | Stocks impact | Gold impact | Crypto impact]\n\n"
                "### Overall Signal: [BULLISH/BEARISH/NEUTRAL]\n\n"
                "### Actionable Recommendations\n"
                "1. [BUY/SELL/HOLD] [Asset] — [1-line reason]\n"
                "2. [BUY/SELL/HOLD] [Asset] — [1-line reason]\n"
                "3. [BUY/SELL/HOLD] [Asset] — [1-line reason]\n\n"
                "### Why This Matters\n"
                "[2-3 sentence overall interpretation]"
            ),
            agent=decision_agent,
            context=[fetch_task],
        )

        crew = Crew(
            agents=[news_fetcher, decision_agent],
            tasks=[fetch_task, decision_task],
            process=Process.sequential,
            memory=False,
            verbose=True,
        )

        result = crew.kickoff()
        result_str = str(result) if result else ""

        return {
            "run_id": run_id,
            "status": "success",
            "result": result_str,
            "error": None,
            "timestamp": datetime.now().isoformat(),
        }

    except Exception as e:
        return {
            "run_id": run_id,
            "status": "failed",
            "result": None,
            "error": str(e),
            "timestamp": datetime.now().isoformat(),
        }
