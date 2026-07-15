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
import yfinance as yf
import feedparser


def _get_news_llm(model_name: str = None):
    """Build a CrewAI LLM for the news group.

    Priority: Groq llama-3.1-8b-instant (primary, 6k TPM)
              → gemini/gemini-2.0-flash (fallback, 1M TPM free tier)
              → mistral/mistral-small-latest (last resort)

    max_tokens kept low (2048) to stay within Groq’s per-request limit.
    """
    if not model_name:
        model_name = os.environ.get("NEWS_MODEL", "groq/llama-3.1-8b-instant")
    elif "/" not in model_name:
        model_name = f"groq/{model_name}"
    return LLM(model=model_name, max_tokens=2048)


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

    Model group: news_group (Groq primary → Gemini 2.0 Flash fallback → Mistral).
    Completely isolated from the analysis_group used by /analysis page agents.
    """
    run_id = f"news_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    try:
        # news_group priority order: Groq fast → Gemini Flash → Mistral small
        NEWS_AGENT_MODELS = [
            "groq/llama-3.1-8b-instant",       # 6,000 TPM — fast, 128k ctx, primary
            "groq/gemma2-9b-it",               # 14,400 TPM — Groq alt if llama hits limit
            "gemini/gemini-2.0-flash",          # 1,000,000 TPM — Gemini fallback
            "mistral/mistral-small-latest",     # 50,000 TPM — last resort
        ]
        result = None
        error_msg = ""

        for model_name in NEWS_AGENT_MODELS:
            try:
                llm = _get_news_llm(model_name)

                # ── Agent 1: News Fetcher (backstory trimmed for input-token savings)
                news_fetcher = Agent(
                    role="Market Intelligence Analyst",
                    goal="Fetch today's top market headlines across macro, all Indian sectors, and key people. Summarise each in 1 sentence.",
                    backstory=(
                        "Ex-Bloomberg analyst with 20 years covering Indian and global markets. "
                        "Precise and concise — focused only on what moves markets for Indian investors."
                    ),
                    tools=[MarketNewsTool()],
                    llm=llm,
                    verbose=True,
                    max_iter=2,
                )

                # ── Agent 2: Decision Agent (backstory trimmed for input-token savings)
                decision_agent = Agent(
                    role="Market Strategist",
                    goal="Convert news into BUY/SELL/HOLD signals for Indian stocks, gold, MFs, and crypto.",
                    backstory=(
                        "Quant strategist with 15 years on Goldman Sachs India desk. "
                        "Issues direct, actionable signals — no disclaimers. "
                        "Start output directly with '## Market News Analysis'. No 'Thought:' preamble."
                    ),
                    llm=llm,
                    verbose=True,
                    max_iter=2,
                )

                # ── Task 1: Fetch & summarise (description trimmed)
                fetch_task = Task(
                    description=(
                        f"Date: {datetime.now().strftime('%Y-%m-%d')}. "
                        "Use Market News Fetcher tool. For each headline return: "
                        "(a) headline, (b) 1-sentence impact, (c) asset class affected."
                    ),
                    expected_output=(
                        "Numbered list. Each item: Headline | Impact | Asset (Stocks/Gold/Crypto/Bonds/Sector)"
                    ),
                    agent=news_fetcher,
                )

                # ── Task 2: Signals (description trimmed — sector list abbreviated)
                decision_task = Task(
                    description=(
                        "From the news list, assess impact on: Nifty50, Sensex, VIX, INR, bonds, gold, crude, crypto. "
                        "Sectors: banking, IT, pharma, FMCG, auto/EV, energy, metals, realty, telecom, chemicals, defence, aviation, retail, fintech, insurance, media. "
                        "Flag any statement from Powell/Sitharaman/RBI Gov/Dimon/Buffett/Musk. "
                        "Then output: overall stance (BULLISH/BEARISH/NEUTRAL), risk level (LOW/MEDIUM/HIGH), "
                        "top 3 BUY/SELL/HOLD calls with asset name + 1-line reason, timeframe 1-7 days."
                    ),
                    expected_output=(
                        "## Market News Analysis\n"
                        "**Date:** [date] | **Risk:** [LOW/MEDIUM/HIGH] | **Stance:** [BULLISH/BEARISH/NEUTRAL]\n\n"
                        "### Key Events\n"
                        "[numbered list: headline → impact → Stocks/Gold/Crypto signal]\n\n"
                        "### Recommendations\n"
                        "1. [BUY/SELL/HOLD] [Asset] — [reason]\n"
                        "2. [BUY/SELL/HOLD] [Asset] — [reason]\n"
                        "3. [BUY/SELL/HOLD] [Asset] — [reason]\n\n"
                        "### Alerts\n"
                        "[Key person statements or upcoming events]\n\n"
                        "### Summary\n"
                        "[2-3 sentence synthesis]"
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
                    max_rpm=10,
                )

                print(f"[News Agent] Attempting execution with model: {model_name}")
                result = crew.kickoff()
                break
            except Exception as e:
                err_str = str(e).lower()
                if any(k in err_str for k in (
                    "429", "rate limit", "token", "context_length", "too large",
                    "decommissioned", "invalid_request", "not supported",
                    "does not exist", "model_not_found", "not found"
                )):
                    print(f"[News Agent] Model error on {model_name}: {err_str[:120]}. Falling back...")
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
