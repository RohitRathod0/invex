import asyncio
import sys
import uuid
import os
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path

# Add crew_core to sys.path to allow importing invex
BASE_DIR = Path(__file__).resolve().parent.parent.parent
CREW_CORE_DIR = BASE_DIR / "crew_core"
sys.path.append(str(CREW_CORE_DIR / "src"))

# Load crew_core environment variables (GROQ_API_KEY, MODEL, etc.)
crew_env_file = CREW_CORE_DIR / ".env"
if crew_env_file.exists():
    with open(crew_env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, _, val = line.partition('=')
                os.environ.setdefault(key.strip(), val.strip())

try:
    from invex.crew import Invex
    print(f"✅ Successfully imported Invex from {CREW_CORE_DIR / 'src'}")
except ImportError as e:
    print(f"⚠️  Warning: Could not import Invex from {CREW_CORE_DIR / 'src'}: {e}")
    Invex = None


def _risk_percentage_to_text(risk_percentage: int) -> str:
    """Convert numeric risk percentage to descriptive text for the crew."""
    if risk_percentage < 30:
        return "conservative"
    elif risk_percentage < 60:
        return "moderate"
    else:
        return "aggressive"


async def run_crew_agent(message: str, session_id: str, inputs: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Executes the Invex crew with the given message and form inputs.
    Returns the result as a dictionary.
    """
    if not Invex:
        return {
            "run_id": str(uuid.uuid4()),
            "session_id": session_id,
            "status": "failed",
            "error": "CrewAI module (Invex) could not be imported. Check that crew_core/src is accessible.",
            "result": None,
            "created_at": datetime.now().isoformat()
        }

    run_id = str(uuid.uuid4())

    # Build crew inputs, merging user form data with sensible defaults
    capital = 100000.0
    risk_pct = 50
    duration = 5
    expected_returns = 15
    asset_preferences = {'stocks': True, 'mutual_funds': True, 'gold': True, 'crypto': True}

    if inputs:
        capital = float(inputs.get('capital_amount', capital))
        risk_pct = int(inputs.get('risk_percentage', risk_pct))
        duration = int(inputs.get('duration_years', duration))
        expected_returns = float(inputs.get('expected_returns', expected_returns))
        if 'asset_preferences' in inputs:
            asset_preferences = inputs['asset_preferences']

    risk_tolerance_text = _risk_percentage_to_text(risk_pct)

    crew_inputs = {
        'capital_amount': capital,
        'risk_tolerance': risk_tolerance_text,       # "conservative" / "moderate" / "aggressive"
        'risk_percentage': risk_pct,                  # numeric 0-100
        'investment_horizon': f"{duration} years",
        'duration_years': duration,
        'expected_returns': expected_returns,
        'current_date': datetime.now().strftime("%Y-%m-%d"),
        'topic': message,
        'asset_preferences': asset_preferences,
        # Flatten asset_preferences into top-level keys for template access
        'stocks': asset_preferences.get('stocks', True),
        'mutual_funds': asset_preferences.get('mutual_funds', True),
        'gold': asset_preferences.get('gold', True),
        'crypto': asset_preferences.get('crypto', True),
    }

    try:
        result = await asyncio.to_thread(_execute_crew_blocking, crew_inputs, asset_preferences)

        return {
            "run_id": run_id,
            "session_id": session_id,
            "status": "completed",
            "result": str(result),
            "created_at": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "run_id": run_id,
            "session_id": session_id,
            "status": "failed",
            "error": str(e),
            "result": None,
            "created_at": datetime.now().isoformat()
        }


def _execute_crew_blocking(inputs: Dict[str, Any], asset_preferences: Dict[str, bool]):
    """Blocking wrapper for crew execution (runs in thread pool to avoid blocking event loop)."""
    # Ensure outputs/ dir exists relative to current working directory
    os.makedirs("outputs", exist_ok=True)
    invex_crew = Invex()
    invex_crew.user_preferences = asset_preferences
    result = invex_crew.crew().kickoff(inputs=inputs)
    return result
