"""
News crew service — 3-layer market intelligence system:

  Layer 1 — Global Macro (always fetched): RBI/Fed policy, FII flows, VIX, crude, rupee, bond yields.
  Layer 2 — Sector Coverage (all 16 sectors): banking, IT, pharma, FMCG, auto/EV, energy, metals,
             real estate, telecom, chemicals, defence, aviation, retail, media, insurance, fintech.
  Layer 3 — High-Impact People: Powell, Dimon, Buffett, Musk, RBI Governor, Nirmala Sitharaman, etc.

No external API key needed — uses yfinance + Google News RSS.
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


def _get_news_llm(model_name: str = None):
    # Use gemma2-9b-it specifically for news to bypass extreme Groq TPM limits on llama
    if not model_name:
        model_name = os.environ.get("NEWS_MODEL", "groq/gemma2-9b-it")
    elif "/" not in model_name:
        model_name = f"groq/{model_name}"
    return LLM(model=model_name, max_tokens=2500)


# ---------------------------------------------------------------------------
# Layer definitions — what to always monitor
# ---------------------------------------------------------------------------

# Layer 1: Global macro — always fetch, market-moving regardless of profile
_LAYER1_MACRO_RSS = [
    ("https://news.google.com/rss/search?q=RBI+repo+rate+OR+RBI+policy+decision&hl=en-IN&gl=IN&ceid=IN:en",   "RBI Policy"),
    ("https://news.google.com/rss/search?q=US+Fed+interest+rate+OR+Jerome+Powell+statement&hl=en&gl=US&ceid=US:en", "Fed/Powell"),
    ("https://news.google.com/rss/search?q=FII+DII+flows+India+stock+market&hl=en-IN&gl=IN&ceid=IN:en",        "FII/DII Flows"),
    ("https://news.google.com/rss/search?q=India+VIX+Nifty+outlook+market+sentiment&hl=en-IN&gl=IN&ceid=IN:en","India VIX"),
    ("https://news.google.com/rss/search?q=crude+oil+prices+OPEC+production&hl=en&gl=US&ceid=US:en",           "Crude/OPEC"),
    ("https://news.google.com/rss/search?q=rupee+dollar+exchange+rate+RBI+intervention&hl=en-IN&gl=IN&ceid=IN:en", "Rupee/Dollar"),
    ("https://news.google.com/rss/search?q=India+inflation+CPI+WPI+data&hl=en-IN&gl=IN&ceid=IN:en",            "CPI/WPI"),
    ("https://news.google.com/rss/search?q=India+GDP+growth+IIP+data&hl=en-IN&gl=IN&ceid=IN:en",               "GDP/IIP"),
    ("https://news.google.com/rss/search?q=gold+prices+safe+haven+demand&hl=en&gl=US&ceid=US:en",              "Gold"),
    ("https://news.google.com/rss/search?q=India+10+year+bond+yield+g-sec&hl=en-IN&gl=IN&ceid=IN:en",          "Bond Yields"),
    ("https://news.google.com/rss/search?q=US+China+trade+tariffs+geopolitics&hl=en&gl=US&ceid=US:en",         "US-China Trade"),
    ("https://news.google.com/rss/search?q=Russia+Ukraine+war+market+impact&hl=en&gl=US&ceid=US:en",           "Russia-Ukraine"),
    ("https://news.google.com/rss/search?q=Middle+East+conflict+oil+supply&hl=en&gl=US&ceid=US:en",            "Middle East"),
    ("https://news.google.com/rss/search?q=GST+collection+India+economy&hl=en-IN&gl=IN&ceid=IN:en",            "GST Data"),
    ("https://news.google.com/rss/search?q=India+monsoon+rainfall+forecast+impact&hl=en-IN&gl=IN&ceid=IN:en", "Monsoon"),
]

# Layer 2: All-sector coverage
_LAYER2_SECTORS_RSS = [
    ("https://news.google.com/rss/search?q=Indian+banking+NPA+credit+growth+CASA+RBI&hl=en-IN&gl=IN&ceid=IN:en", "Banking"),
    ("https://news.google.com/rss/search?q=Indian+IT+sector+TCS+Infosys+deal+wins+dollar&hl=en-IN&gl=IN&ceid=IN:en", "IT/Tech"),
    ("https://news.google.com/rss/search?q=pharma+India+USFDA+approval+drug+recall&hl=en-IN&gl=IN&ceid=IN:en",  "Pharma"),
    ("https://news.google.com/rss/search?q=FMCG+India+rural+demand+consumer+staples&hl=en-IN&gl=IN&ceid=IN:en", "FMCG"),
    ("https://news.google.com/rss/search?q=auto+sector+India+sales+data+EV+PLI&hl=en-IN&gl=IN&ceid=IN:en",     "Auto/EV"),
    ("https://news.google.com/rss/search?q=energy+sector+India+oil+gas+renewables+power&hl=en-IN&gl=IN&ceid=IN:en", "Energy"),
    ("https://news.google.com/rss/search?q=metals+mining+India+steel+iron+ore+LME&hl=en-IN&gl=IN&ceid=IN:en",  "Metals/Mining"),
    ("https://news.google.com/rss/search?q=real+estate+infrastructure+India+REIT&hl=en-IN&gl=IN&ceid=IN:en",    "Real Estate"),
    ("https://news.google.com/rss/search?q=telecom+India+Jio+Airtel+spectrum+5G&hl=en-IN&gl=IN&ceid=IN:en",    "Telecom"),
    ("https://news.google.com/rss/search?q=chemicals+fertilizers+India+sector&hl=en-IN&gl=IN&ceid=IN:en",      "Chemicals"),
    ("https://news.google.com/rss/search?q=defence+aerospace+India+HAL+BEL+DRDO&hl=en-IN&gl=IN&ceid=IN:en",   "Defence"),
    ("https://news.google.com/rss/search?q=aviation+India+IndiGo+Air+India+turnaround&hl=en-IN&gl=IN&ceid=IN:en", "Aviation"),
    ("https://news.google.com/rss/search?q=retail+ecommerce+India+Reliance+Flipkart&hl=en-IN&gl=IN&ceid=IN:en", "Retail/Ecomm"),
    ("https://news.google.com/rss/search?q=NBFC+fintech+India+UPI+Paytm+payments&hl=en-IN&gl=IN&ceid=IN:en",   "Fintech/NBFC"),
    ("https://news.google.com/rss/search?q=insurance+India+LIC+sector+premium&hl=en-IN&gl=IN&ceid=IN:en",      "Insurance"),
    ("https://news.google.com/rss/search?q=media+entertainment+OTT+India&hl=en-IN&gl=IN&ceid=IN:en",           "Media/OTT"),
]

# Layer 3: High-impact people — one statement moves markets
_LAYER3_PEOPLE_RSS = [
    ("https://news.google.com/rss/search?q=Jerome+Powell+statement+Fed+policy&hl=en&gl=US&ceid=US:en",             "Powell/Fed"),
    ("https://news.google.com/rss/search?q=Jamie+Dimon+JPMorgan+economy+outlook&hl=en&gl=US&ceid=US:en",            "Dimon/JPMorgan"),
    ("https://news.google.com/rss/search?q=Warren+Buffett+Berkshire+investment&hl=en&gl=US&ceid=US:en",             "Buffett"),
    ("https://news.google.com/rss/search?q=Elon+Musk+market+Tesla+X+statement&hl=en&gl=US&ceid=US:en",              "Musk"),
    ("https://news.google.com/rss/search?q=Larry+Fink+BlackRock+market+outlook&hl=en&gl=US&ceid=US:en",             "Fink/BlackRock"),
    ("https://news.google.com/rss/search?q=Nirmala+Sitharaman+budget+fiscal+policy&hl=en-IN&gl=IN&ceid=IN:en",      "Sitharaman"),
    ("https://news.google.com/rss/search?q=RBI+Governor+Sanjay+Malhotra+OR+Shaktikanta+Das+statement&hl=en-IN&gl=IN&ceid=IN:en", "RBI Governor"),
    ("https://news.google.com/rss/search?q=Uday+Kotak+OR+Shankar+Sharma+market+India&hl=en-IN&gl=IN&ceid=IN:en",  "India Experts"),
]

# Layer 4: Global markets — US indices, European/Japan/China central banks, DXY, global tech
_LAYER4_GLOBAL_RSS = [
    # US Markets
    ("https://news.google.com/rss/search?q=S%26P+500+stock+market+outlook+today&hl=en&gl=US&ceid=US:en",     "S&P500"),
    ("https://news.google.com/rss/search?q=Nasdaq+US+tech+stock+market&hl=en&gl=US&ceid=US:en",              "Nasdaq"),
    ("https://news.google.com/rss/search?q=Dow+Jones+Wall+Street+market+today&hl=en&gl=US&ceid=US:en",       "Dow Jones"),
    # Other Central Banks
    ("https://news.google.com/rss/search?q=ECB+European+Central+Bank+rate+decision&hl=en&gl=US&ceid=US:en",  "ECB"),
    ("https://news.google.com/rss/search?q=Bank+of+Japan+BOJ+yen+monetary+policy&hl=en&gl=US&ceid=US:en",   "BOJ/Yen"),
    # China
    ("https://news.google.com/rss/search?q=China+PMI+economic+data+outlook&hl=en&gl=US&ceid=US:en",          "China PMI"),
    ("https://news.google.com/rss/search?q=China+exports+trade+data+economy&hl=en&gl=US&ceid=US:en",         "China Trade"),
    ("https://news.google.com/rss/search?q=Shanghai+Hang+Seng+China+stock+market&hl=en&gl=US&ceid=US:en",   "China Markets"),
    # Dollar & EM
    ("https://news.google.com/rss/search?q=dollar+index+DXY+US+dollar+strength&hl=en&gl=US&ceid=US:en",      "DXY/Dollar"),
    ("https://news.google.com/rss/search?q=emerging+markets+capital+flows+EM+bonds&hl=en&gl=US&ceid=US:en",  "EM Flows"),
    # Global Tech
    ("https://news.google.com/rss/search?q=Nvidia+AI+earnings+semiconductor+stocks&hl=en&gl=US&ceid=US:en",  "Nvidia/AI"),
    ("https://news.google.com/rss/search?q=Apple+Microsoft+quarterly+results+earnings&hl=en&gl=US&ceid=US:en","Apple/MSFT"),
    ("https://news.google.com/rss/search?q=global+tech+sector+AI+stocks+outlook&hl=en&gl=US&ceid=US:en",     "Global Tech"),
    # IMF / World Bank
    ("https://news.google.com/rss/search?q=IMF+World+Bank+global+growth+forecast&hl=en&gl=US&ceid=US:en",    "IMF/WB"),
]

# Layer 5: Cryptocurrency
_LAYER5_CRYPTO_RSS = [
    ("https://news.google.com/rss/search?q=Bitcoin+price+today+market+BTC&hl=en&gl=US&ceid=US:en",            "Bitcoin"),
    ("https://news.google.com/rss/search?q=Ethereum+ETH+crypto+defi+market&hl=en&gl=US&ceid=US:en",           "Ethereum"),
    ("https://news.google.com/rss/search?q=cryptocurrency+regulation+crypto+market+altcoin&hl=en&gl=US&ceid=US:en", "Crypto"),
]


_HIGH_PRIORITY_KEYWORDS = [
    # Macro triggers
    "rate", "rbi", "fed", "repo", "inflation", "gdp", "cpi", "wpi", "fii", "dii",
    "vix", "rupee", "dollar", "crude", "gold", "bond", "yield", "gst", "monsoon",
    # Global markets
    "s&p", "nasdaq", "dow", "ecb", "boj", "yen", "china", "pmi", "dxy", "emerging",
    "nvidia", "apple", "microsoft", "semiconductor", "ai", "tech", "earnings",
    # Market actions
    "rally", "crash", "surge", "plunge", "drop", "guidance", "miss", "beat",
    "buyback", "dividend", "ipo", "qip", "fpo", "merger", "acquisition", "sebi",
    # Geopolitics
    "war", "conflict", "sanction", "tariff", "opec", "ceasefire", "trade",
    # People triggers
    "powell", "dimon", "buffett", "musk", "sitharaman", "malhotra", "fink", "dalio", "soros",
    # Sectors
    "npa", "usfda", "approval", "recall", "deal", "contract", "spectrum", "5g",
    "ev", "pli", "drdo", "hal", "lic",
    # Crypto
    "bitcoin", "ethereum", "crypto", "btc", "eth", "blockchain", "defi",
]


# ---------------------------------------------------------------------------
# News Fetching Tool
# ---------------------------------------------------------------------------
class MarketNewsTool(BaseTool):
    name: str = "Market News Fetcher"
    description: str = (
        "Fetches comprehensive market intelligence across 5 layers: "
        "(1) Global macro — RBI/Fed/VIX/FII/crude/rupee/bond yields/GST/monsoon, "
        "(2) All 16 Indian sectors — banking, IT, pharma, auto, energy, metals, defence, etc., "
        "(3) High-impact people — Powell, Dimon, Sitharaman, RBI Governor, Buffett, Musk, Fink, "
        "(4) Global markets — S&P500, Nasdaq, ECB, BOJ, China PMI, DXY, Nvidia, Apple, EM flows, "
        "(5) Crypto — Bitcoin, Ethereum, crypto regulation. "
        "Returns top 15 headlines scored by market-relevance, deduplicated."
    )

    def _run(self) -> str:
        news_items: list[str] = []

        def _fetch_rss(feeds: list[tuple], max_per_source: int) -> list[str]:
            collected = []
            for url, source in feeds:
                try:
                    feed = feedparser.parse(url)
                    for entry in feed.entries[:max_per_source]:
                        title = entry.get("title", "").strip()
                        if title:
                            collected.append(f"[{source}] {title}")
                except Exception:
                    pass
            return collected

        # ── Layer 1: Global macro (2 per source — highest priority)
        news_items.extend(_fetch_rss(_LAYER1_MACRO_RSS, max_per_source=2))

        # ── Layer 2: Sector coverage (1 per sector — breadth over depth)
        news_items.extend(_fetch_rss(_LAYER2_SECTORS_RSS, max_per_source=1))

        # ── Layer 3: High-impact people (1 per person)
        news_items.extend(_fetch_rss(_LAYER3_PEOPLE_RSS, max_per_source=1))

        # ── Layer 4: Global markets — US, ECB, China, DXY, global tech (1 per source)
        news_items.extend(_fetch_rss(_LAYER4_GLOBAL_RSS, max_per_source=1))

        # ── Layer 5: Crypto (1 per source)
        news_items.extend(_fetch_rss(_LAYER5_CRYPTO_RSS, max_per_source=1))

        # ── yfinance: benchmark tickers for real-time signals
        yf_tickers = [
            ("^NSEI",    "Nifty50"),
            ("^BSESN",   "Sensex"),
            ("^GSPC",    "S&P500"),
            ("GC=F",     "Gold"),
            ("CL=F",     "Crude Oil"),
            ("BTC-USD",  "Bitcoin"),
            ("USDINR=X", "USD/INR"),
            ("RELIANCE.NS", "Reliance"),
            ("HDFCBANK.NS", "HDFC Bank"),
            ("INFY.NS",    "Infosys"),
        ]
        for sym, label in yf_tickers:
            try:
                t = yf.Ticker(sym)
                for article in (t.news or [])[:2]:
                    title = article.get("title", "")
                    if title:
                        news_items.append(f"[{label}] {title}")
            except Exception:
                pass

        # ── De-duplicate (preserve first occurrence)
        seen: set[str] = set()
        unique_items = []
        for item in news_items:
            key = item.lower().strip()
            if key not in seen:
                seen.add(key)
                unique_items.append(item)

        # ── Score by keyword relevance
        scored: list[tuple[int, str]] = []
        for item in unique_items:
            score = sum(1 for kw in _HIGH_PRIORITY_KEYWORDS if kw in item.lower())
            scored.append((score, item))

        # Sort descending, take top 15
        scored.sort(key=lambda x: x[0], reverse=True)
        top_items = [itm for _, itm in scored[:15]]

        return "\n".join(f"{i+1}. {item}" for i, item in enumerate(top_items))


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
        NEWS_AGENT_MODELS = [
            "groq/meta-llama/llama-4-scout-17b-16e-instruct",  # primary
            "groq/compound-mini",                                # fallback
            "groq/llama-3.3-70b-versatile",                     # last resort
        ]

        import time
        result = None
        error_msg = ""

        for model_name in NEWS_AGENT_MODELS:
            try:
                llm = _get_news_llm(model_name)

                # Agent 1: News Fetcher
                news_fetcher = Agent(
                    role="Market Intelligence Analyst",
                    goal=(
                        "Fetch today's comprehensive market intelligence covering: "
                        "(1) Global macro — RBI/Fed policy, FII flows, VIX, crude, rupee, bond yields, CPI, GDP; "
                        "(2) All 16 Indian market sectors; "
                        "(3) High-impact people — Powell, Sitharaman, RBI Governor, Dimon, Buffett, Musk. "
                        "Summarize each headline in 1-2 sentences focused on market impact."
                    ),
                    backstory=(
                        "Former Bloomberg Intelligence analyst and ex-NSE chief economist with 20 years covering Indian and global markets. "
                        "You understand every signal that moves markets: Fed rate decisions, FII/DII rotation, monsoon impact on FMCG/agri, "
                        "USFDA rulings on pharma, OPEC output cuts, RBI intervention on rupee, SEBI regulations, PLI scheme updates, "
                        "quarterly earnings beats/misses, promoter buying, and statements from key global market movers. "
                        "You are precise, concise, and laser-focused on what actually matters to Indian investors."
                    ),
                    tools=[MarketNewsTool()],
                    llm=llm,
                    verbose=True,
                    max_iter=2,
                )

                # Agent 2: Market Decision Agent
                decision_agent = Agent(
                    role="Market Impact Strategist",
                    goal=(
                        "Convert the 3-layer intelligence brief into precise BUY/SELL/HOLD signals "
                        "for Indian stocks, gold, mutual funds, and crypto with sector-specific reasoning."
                    ),
                    backstory=(
                        "Quantitative strategist from Goldman Sachs India Equities desk with 15 years of cross-asset experience. "
                        "You deeply understand transmission mechanisms: "
                        "Fed hikes → dollar surge → FII outflows → Nifty drop; "
                        "Oil spike → input cost pressure → auto/paint/chemical sector pain; "
                        "RBI rate cut → banking NIM compression → NBFC/housing finance benefit; "
                        "USFDA approval → pharma stock re-rating; "
                        "Monsoon deficit → rural FMCG demand drop → agri commodity spike; "
                        "Sitharaman capex boost → infra/defence/PSU rally. "
                        "You issue direct, actionable signals with sector-specific reasoning — no vague disclaimers. "
                        "CRITICAL INSTRUCTION: Output ONLY the final required format. "
                        "DO NOT output 'Thought:' or reasoning preamble. Start directly with '## Market News Analysis'."
                    ),
                    llm=llm,
                    verbose=True,
                    max_iter=2,
                )

                # Task 1: Fetch & brief news
                fetch_task = Task(
                    description=(
                        "Use the Market News Fetcher tool to retrieve today's 3-layer market intelligence. "
                        "You will receive headlines from: "
                        "LAYER 1 (Macro): RBI/Fed/FII/VIX/crude/rupee/gold/bond yields/CPI/GDP/GST/monsoon/geopolitics; "
                        "LAYER 2 (Sectors): banking, IT, pharma, FMCG, auto/EV, energy, metals, real estate, telecom, chemicals, defence, aviation, retail, fintech, insurance, media; "
                        "LAYER 3 (People): Powell, Dimon, Sitharaman, RBI Governor, Buffett, Musk, Fink. "
                        "For each of the top 15 headlines, provide: (a) brief headline, (b) 1-sentence market impact summary, (c) which asset class is affected. "
                        f"Today's date: {datetime.now().strftime('%Y-%m-%d')}"
                    ),
                    expected_output=(
                        "Numbered list of 15 market intelligence briefs, each with: "
                        "Headline | 1-sentence impact | Assets affected (Stocks/Gold/Crypto/Bonds/Sector)"
                    ),
                    agent=news_fetcher,
                )

                # Task 2: Issue signals
                decision_task = Task(
                    description=(
                        "Review the news summaries from the previous task. "
                        "For each of the 15 items, assess impact on the following asset classes and sectors:\n"
                        "MACRO: Nifty50, Sensex, India VIX, rupee/dollar, bond yields, gold, crude oil, crypto.\n"
                        "SECTORS: banking (NPA/credit growth), IT (dollar/deal wins), pharma (USFDA), FMCG (monsoon/rural), "
                        "auto/EV (sales/PLI), energy/oil (OPEC/crude), metals (China demand/LME), real estate (rate cuts), "
                        "telecom (spectrum/5G), chemicals (input costs), defence (DRDO/HAL contracts), aviation (ATF prices), "
                        "retail/ecomm (consumption), fintech/NBFC (RBI policy), insurance (LIC), media/OTT (ad revenue).\n"
                        "PEOPLE IMPACT: Flag any market-moving statement from Powell/Sitharaman/RBI Gov/Dimon/Buffett/Musk.\n\n"
                        "Then issue the OVERALL PORTFOLIO SIGNAL:\n"
                        "- Market stance: BULLISH / BEARISH / NEUTRAL\n"
                        "- Risk level today: LOW / MEDIUM / HIGH\n"
                        "- Top 3 actionable BUY/SELL/HOLD recommendations with specific asset names and 1-line rationale\n"
                        "- Timeframe: 1-7 days\n"
                        "- Alternative signals to watch: any macro data, earnings, or event within next 7 days"
                    ),
                    expected_output=(
                        "## Market News Analysis\n"
                        "**Date:** [date] | **Risk Level:** [LOW/MEDIUM/HIGH]\n\n"
                        "### Key Events & Market Impact\n"
                        "1. [Headline]\n"
                        "[1-sentence impact]\n"
                        "- Stocks: [Positive/Negative/Neutral] | Sector: [sector name] | Gold: [P/N/N] | Crypto: [P/N/N]\n"
                        "\n"
                        "2. [Headline]\n"
                        "(repeat for all 15 events)\n\n"
                        "### Overall Signal: [BULLISH/BEARISH/NEUTRAL]\n\n"
                        "### Actionable Recommendations\n"
                        "1. [BUY/SELL/HOLD] [Specific Asset/Sector ETF/Stock] — [1-line reason]\n"
                        "2. [BUY/SELL/HOLD] [Specific Asset/Sector ETF/Stock] — [1-line reason]\n"
                        "3. [BUY/SELL/HOLD] [Specific Asset/Sector ETF/Stock] — [1-line reason]\n\n"
                        "### Key Alerts\n"
                        "[Any market-mover person statement or high-impact event to watch]\n\n"
                        "### Why This Matters\n"
                        "[2-3 sentence synthesis: macro + sector + people signals combined]"
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
                    max_rpm=15,
                )

                print(f"[News Agent] Attempting execution with model: {model_name}")
                result = crew.kickoff()
                break
            except Exception as e:
                err_str = str(e).lower()
                if "429" in err_str or "rate limit" in err_str:
                    print(f"[News Agent] Rate limited on {model_name}. Falling back...")
                    error_msg = err_str
                    continue
                else:
                    raise e
        
        if result is None:
            raise Exception(f"All models rate limited or failed. Last error: {error_msg}")

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
