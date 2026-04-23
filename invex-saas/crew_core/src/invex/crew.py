from crewai import Agent, Crew, Process, Task
import os
from crewai.project import CrewBase, agent, crew, task
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
def _groq_llm():
    """Groq: fast, used for lighter data-gathering agents (macro + market)."""
    from langchain_groq import ChatGroq
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=os.environ.get("GROQ_API_KEY"),
        temperature=0.2,
    )

def _gemini_llm():
    """Gemini: mid-tier, used for analysis agents (alternatives + optimizer)."""
    from langchain_google_genai import ChatGoogleGenerativeAI
    return ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",          # 1M token context, generous free quota
        google_api_key=os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"),
        temperature=0.2,
        max_output_tokens=4096,
    )

def _mistral_llm():
    """Mistral: final synthesis agent (report writer) — large context, high quality."""
    from langchain_mistralai import ChatMistralAI
    return ChatMistralAI(
        model="mistral-large-2512",
        api_key=os.environ.get("MISTRAL_API_KEY"),
        temperature=0.2,
        max_tokens=8192,
    )

def _mistral_fast_llm():
    """Mistral small — fallback within Mistral tier."""
    from langchain_mistralai import ChatMistralAI
    return ChatMistralAI(
        model="ministral-8b-2512",
        api_key=os.environ.get("MISTRAL_API_KEY"),
        temperature=0.2,
        max_tokens=4096,
    )


# ── Relay LLM builder — returns LLM with .with_fallbacks() chain ─────────────
def _relay_llm_for(tier: str):
    """
    Returns a LangChain LLM wired as a relay fallback chain.

    Tier assignment (this is the 'continue' relay the user asked for):
      'groq'    → macro_economist + market_analyst
                  (Groq primary → Gemini fallback → Mistral last resort)
      'gemini'  → alternative_assets_analyst + portfolio_optimizer
                  (Gemini primary → Mistral fallback)
      'mistral' → report_writer
                  (Mistral primary → Gemini fallback)

    CrewAI's sequential process passes each agent's output as context to
    the next agent, so the 'relay' is both across errors AND across providers.
    """
    if tier == "groq":
        primary = _groq_llm()
        return primary.with_fallbacks([_gemini_llm(), _mistral_fast_llm()])
    elif tier == "gemini":
        primary = _gemini_llm()
        return primary.with_fallbacks([_mistral_llm()])
    else:  # mistral
        primary = _mistral_llm()
        return primary.with_fallbacks([_gemini_llm()])


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
        # Tier 1: Groq (fast data-gathering) → Gemini → Mistral
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
        # Tier 1: Groq (fast macro data) → Gemini → Mistral
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
        # Tier 2: Gemini (receives Groq context, does deeper analysis) → Mistral
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
        # Tier 2: Gemini (receives all prior context, optimizes allocation) → Mistral
        return Agent(
            config=self.agents_config['portfolio_optimizer'],
            llm=_relay_llm_for('gemini'),
            verbose=True,
            max_iter=2,
            respect_context_window=True
        )

    @agent
    def report_writer(self) -> Agent:
        # Tier 3: Mistral (receives ALL prior context, writes final report) → Gemini
        return Agent(
            config=self.agents_config['report_writer'],
            llm=_relay_llm_for('mistral'),
            verbose=True,
            max_iter=2,
            respect_context_window=True
        )

    @task
    def analyze_markets(self) -> Task:
        return Task(
            config=self.tasks_config['analyze_markets']
        )

    @task
    def analyze_economy(self) -> Task:
        return Task(
            config=self.tasks_config['analyze_economy']
        )

    @task
    def analyze_alternatives(self) -> Task:
        return Task(
            config=self.tasks_config['analyze_alternatives']
        )

    @task
    def optimize_portfolio(self) -> Task:
        return Task(
            config=self.tasks_config['optimize_portfolio']
        )

    @task
    def generate_report(self) -> Task:
        from invex.schemas import PortfolioReport
        return Task(
            config=self.tasks_config['generate_report'],
            output_json=PortfolioReport
            # Removed output_file since we want JSON text to return to the backend
        )

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
