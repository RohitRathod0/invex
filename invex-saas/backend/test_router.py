import asyncio
import sys
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR.parent / "crew_core" / "src"))
load_dotenv(".env")

from invex.ai_router import InvexV2

async def main():
    print("Initializing InvexV2...")
    crew = InvexV2()
    
    inputs = {
        'capital_amount': 50000,
        'risk_percentage': 50,
        'risk_tolerance': 'moderate',
        'expected_returns': 12,
        'investment_horizon': '5 years',
        'duration_years': 5,
        'asset_preferences': {
            'stocks': True,
            'mutual_funds': True,
            'gold': False,
            'crypto': False
        },
        'execution_mode': 'fast'
    }
    
    print("Running Fast Analysis (testing structured output)...")
    result = await crew.kickoff_async(inputs)
    print(f"Mode Used: {result['mode']}")
    print(f"Execution Time: {result['execution_time']}s")
    print(f"Status: {result['status']}")
    if result.get("error"):
        print(f"Error: {result['error']}")
    else:
        print("\nStructured Output Summary:")
        data = result['result']['structured_data']
        print(f"Total Capital Evaluated: {data['total_capital']}")
        print(f"Recommendations found: {len(data['recommendations'])}")

if __name__ == "__main__":
    asyncio.run(main())
