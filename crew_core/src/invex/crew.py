from crewai import Agent, Crew, Process, Task, LLM as CrewLLM
import os
from crewai.project import CrewBase, agent, crew, task
from invex.tools import (
    StockPriceTool, TopStocksTool, MutualFundTool,
    GoldPriceTool, CryptoPriceTool, TopCryptosTool,
    IndiaGDPTool, IndiaCPITool
)

# ── Error keywords that mean "provider hit a limit" ───────────────────────────
_LIMIT_ERRS = (
    "429", "rate limit", "token", "context_length", "quota",
    "too large", "capacity", "resource_exhausted", "decommissioned",
    "invalid_request", "not supported", "does not exist",
)

def _is_limit_error(e: Exception) -> bool:
    return any(k in str(e).lower() for k in _LIMIT_ERRS)


# ── Provider factory helpers ──────────────────────────────────────────────────
# CRITICAL FIX: Use CrewAI's native LLM class (which talks directly to LiteLLM),
# NOT langchain_google_genai.ChatGoogleGenerativeAI.
#
# langchain_google_genai sends model names as "models/gemini-1.5-flash" (Google API format),
# but LiteLLM (used by CrewAI internally) expects "gemini/gemini-2.0-flash" (provider/model format).
# That mismatch is the root cause of: "LLM Provider NOT provided. You passed model=models/gemini-1.5-flash"
#
# CrewAI's LLM class passes the model string through to LiteLLM verbatim — no mangling.

def _gemini_llm() -> CrewLLM:
    """Gemini 2.0 Flash — primary for ALL /analysis page agents. 1M TPM free tier."""
    return CrewLLM(
        model="gemini/gemini-2.0-flash",
        api_key=os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"),
        temperature=0.2,
        max_tokens=8192,
    )

def _mistral_llm() -> CrewLLM:
    """Mistral large-latest — deep synthesis fallback."""
    return CrewLLM(
        model="mistral/mistral-large-latest",
        api_key=os.environ.get("MISTRAL_API_KEY"),
        temperature=0.2,
        max_tokens=8192,
    )

def _mistral_fast_llm() -> CrewLLM:
    """Mistral small-latest — lighter/cheaper fallback."""
    return CrewLLM(
        model="mistral/mistral-small-latest",
        api_key=os.environ.get("MISTRAL_API_KEY"),
        temperature=0.2,
        max_tokens=4096,
    )

def _groq_llm() -> CrewLLM:
    """Groq llama-3.1-8b — emergency last resort only.
    news_service.py keeps Groq as PRIMARY so this pool is untouched during analysis.
    """
    return CrewLLM(
        model="groq/llama-3.1-8b-instant",
        api_key=os.environ.get("GROQ_API_KEY"),
        temperature=0.2,
        max_tokens=2048,
    )


# ── Runtime provider override ─────────────────────────────────────────────────
# deep_engine sets this before each retry attempt so all agents in the crew
# automatically use the fallback provider without recreating the Invex class.
_OVERRIDE_LLM: "CrewLLM | None" = None

# ── SSE progress callback ─────────────────────────────────────────────────────
# Set by deep_engine before kickoff. Called (from background thread) whenever
# a CrewAI task completes so the SSE endpoint can push it to the browser.
_PROGRESS_CALLBACK = None   # Callable[[dict], None] | None

def _fire_progress(event: dict):
    """Thread-safe: call _PROGRESS_CALLBACK if set."""
    cb = _PROGRESS_CALLBACK
    if cb is not None:
        try:
            cb(event)
        except Exception:
            pass   # never let a progress error kill the crew run

# ── Analysis-group LLM factory ────────────────────────────────────────────────
def _relay_llm_for(tier: str = "analysis") -> CrewLLM:
    """
    Returns the primary CrewAI LLM for /analysis page agents.

    PRIMARY: Mistral large-latest (user has paid Mistral subscription, stable quota).
    FALLBACK: Gemini 2.0 Flash (kept as fallback in case Mistral hits limits).

    All analysis agents share the same group so they NEVER compete with
    news_group (Groq primary) for the same quota pool.
    """
    if _OVERRIDE_LLM is not None:
        return _OVERRIDE_LLM
    return _mistral_llm()   # Mistral is now primary


@CrewBase
class Invex():
    """Invex crew for dynamic asset allocation"""
    # Use absolute paths for config
    import os
    base_path = os.path.dirname(os.path.abspath(__file__))
    agents_config = os.path.join(base_path, 'config/agents.yaml')
    tasks_config = os.path.join(base_path, 'config/tasks.yaml')

    # Default user preferences (can be overridden after instantiation)
    user_preferences = {
        'stocks': True,
        'mutual_funds': True,
        'gold': True,
        'crypto': True
    }

    @agent
    def market_analyst(self) -> Agent:
        return Agent(
            config=self.agents_config['market_analyst'],
            llm=_relay_llm_for('groq'),
            tools=[
                StockPriceTool(),
                TopStocksTool(),
                MutualFundTool()
            ],
            verbose=True,
            max_iter=2,
            respect_context_window=True
        )

    @agent
    def macro_economist(self) -> Agent:
        return Agent(
            config=self.agents_config['macro_economist'],
            llm=_relay_llm_for('groq'),
            tools=[
                IndiaGDPTool(),
                IndiaCPITool()
            ],
            verbose=True,
            max_iter=2,
            respect_context_window=True
        )

    @agent
    def alternative_assets_analyst(self) -> Agent:
        return Agent(
            config=self.agents_config['alternative_assets_analyst'],
            llm=_relay_llm_for('gemini'),
            tools=[
                GoldPriceTool(),
                CryptoPriceTool(),
                TopCryptosTool()
            ],
            verbose=True,
            max_iter=2,
            respect_context_window=True
        )

    @agent
    def portfolio_optimizer(self) -> Agent:
        return Agent(
            config=self.agents_config['portfolio_optimizer'],
            llm=_relay_llm_for('gemini'),
            verbose=True,
            max_iter=2,
            respect_context_window=True
        )

    @agent
    def report_writer(self) -> Agent:
        return Agent(
            config=self.agents_config['report_writer'],
            llm=_relay_llm_for('mistral'),
            verbose=True,
            max_iter=2,
            respect_context_window=True
        )

    @task
    def analyze_markets(self) -> Task:
        def _cb(output):
            _fire_progress({"type": "task_done", "agent": "Market Analyst", "emoji": "📊",
                            "summary": str(output.raw)[:400] if hasattr(output, 'raw') else str(output)[:400]})
        return Task(config=self.tasks_config['analyze_markets'], callback=_cb)

    @task
    def analyze_economy(self) -> Task:
        def _cb(output):
            _fire_progress({"type": "task_done", "agent": "Macro Economist", "emoji": "🌐",
                            "summary": str(output.raw)[:400] if hasattr(output, 'raw') else str(output)[:400]})
        return Task(config=self.tasks_config['analyze_economy'], callback=_cb)

    @task
    def analyze_alternatives(self) -> Task:
        def _cb(output):
            _fire_progress({"type": "task_done", "agent": "Alternatives Analyst", "emoji": "🥇",
                            "summary": str(output.raw)[:400] if hasattr(output, 'raw') else str(output)[:400]})
        return Task(config=self.tasks_config['analyze_alternatives'], callback=_cb)

    @task
    def optimize_portfolio(self) -> Task:
        def _cb(output):
            _fire_progress({"type": "task_done", "agent": "Portfolio Optimizer", "emoji": "⚖️",
                            "summary": str(output.raw)[:400] if hasattr(output, 'raw') else str(output)[:400]})
        return Task(config=self.tasks_config['optimize_portfolio'], callback=_cb)

    @task
    def generate_report(self) -> Task:
        from invex.schemas import PortfolioReport
        def _cb(output):
            _fire_progress({"type": "task_done", "agent": "Report Writer", "emoji": "📝",
                            "summary": str(output.raw)[:400] if hasattr(output, 'raw') else str(output)[:400]})
        return Task(config=self.tasks_config['generate_report'], output_json=PortfolioReport, callback=_cb)

    @crew
    def crew(self) -> Crew:
        """Creates the Invex crew with dynamic task selection based on user preferences"""
        
        # Build task list based on user preferences
        tasks_to_execute = []
        
        print("\n" + "="*80)
        print("🎯 TASK SELECTION BASED ON YOUR PREFERENCES")
        print("="*80)
        
        # Always include economy analysis (provides market context)
        tasks_to_execute.append(self.analyze_economy())
        print("   ✅ Task Added: Analyze Economy (always included)")
        
        # Conditionally add market analysis (stocks and/or mutual funds)
        if self.user_preferences.get('stocks') or self.user_preferences.get('mutual_funds'):
            tasks_to_execute.append(self.analyze_markets())
            if self.user_preferences.get('stocks') and self.user_preferences.get('mutual_funds'):
                print("   ✅ Task Added: Analyze Markets (Stocks + Mutual Funds)")
            elif self.user_preferences.get('stocks'):
                print("   ✅ Task Added: Analyze Markets (Stocks only)")
            else:
                print("   ✅ Task Added: Analyze Markets (Mutual Funds only)")
        else:
            print("   ⏭️  Task Skipped: Analyze Markets (not selected by user)")
        
        # Conditionally add alternative assets analysis (gold and/or crypto)
        if self.user_preferences.get('gold') or self.user_preferences.get('crypto'):
            tasks_to_execute.append(self.analyze_alternatives())
            if self.user_preferences.get('gold') and self.user_preferences.get('crypto'):
                print("   ✅ Task Added: Analyze Alternative Assets (Gold + Crypto)")
            elif self.user_preferences.get('gold'):
                print("   ✅ Task Added: Analyze Alternative Assets (Gold only)")
            else:
                print("   ✅ Task Added: Analyze Alternative Assets (Crypto only)")
        else:
            print("   ⏭️  Task Skipped: Analyze Alternative Assets (not selected by user)")
        
        # Always include optimization and report generation
        tasks_to_execute.append(self.optimize_portfolio())
        print("   ✅ Task Added: Optimize Portfolio (always included)")
        tasks_to_execute.append(self.generate_report())
        print("   ✅ Task Added: Generate Report (always included)")
        
        print(f"\n   📊 Total Tasks to Execute: {len(tasks_to_execute)}/5")
        print("="*80 + "\n")
        
        return Crew(
            agents=self.agents,
            tasks=tasks_to_execute,  # Dynamic task list
            process=Process.sequential,
            memory=False, # Disabled memory to save tokens between turns
            verbose=True,
            max_rpm=5  # Strictly managing rate limits to avoid 429
        )
