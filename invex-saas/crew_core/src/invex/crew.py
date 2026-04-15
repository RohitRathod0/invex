from crewai import Agent, Crew, Process, Task
import os
from crewai.project import CrewBase, agent, crew, task
from crewai import LLM
from invex.tools import (
    StockPriceTool, TopStocksTool, MutualFundTool,
    GoldPriceTool, CryptoPriceTool, TopCryptosTool,
    IndiaGDPTool, IndiaCPITool
)

# Use LLM from environment variables (MODEL + GROQ_API_KEY set in .env)
# Falls back gracefully if not set
def _get_llm():
    model = os.environ.get("MODEL", "groq/llama-3.1-70b-versatile")
    return LLM(model=model, fallbacks=["groq/llama-3.1-8b-instant"], max_tokens=4096)

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
            llm=_get_llm(),
            tools=[
                StockPriceTool(),
                TopStocksTool(),
                MutualFundTool()
            ],
            verbose=True,
            max_iter=10
        )

    @agent
    def macro_economist(self) -> Agent:
        return Agent(
            config=self.agents_config['macro_economist'],
            llm=_get_llm(),
            tools=[
                IndiaGDPTool(),
                IndiaCPITool()
            ],
            verbose=True,
            max_iter=10
        )

    @agent
    def alternative_assets_analyst(self) -> Agent:
        return Agent(
            config=self.agents_config['alternative_assets_analyst'],
            llm=_get_llm(),
            tools=[
                GoldPriceTool(),
                CryptoPriceTool(),
                TopCryptosTool()
            ],
            verbose=True,
            max_iter=10
        )

    @agent
    def portfolio_optimizer(self) -> Agent:
        return Agent(
            config=self.agents_config['portfolio_optimizer'],
            llm=_get_llm(),
            verbose=True,
            max_iter=10
        )

    @agent
    def report_writer(self) -> Agent:
        return Agent(
            config=self.agents_config['report_writer'],
            llm=_get_llm(),
            verbose=True,
            max_iter=10
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
            memory=True,
            verbose=True
        )
