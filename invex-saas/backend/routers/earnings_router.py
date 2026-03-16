from fastapi import APIRouter, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter(prefix="/earnings", tags=["earnings"])
limiter = Limiter(key_func=get_remote_address)

@router.post("/analyze")
@limiter.limit("5/minute")
async def analyze_earnings(request: Request, symbol: str, quarter: str):
    """
    Analyzes an earnings call transcript using external NLP models (Groq) for sentiment.
    - `symbol`: The ticker symbol (e.g. INFY, TCS)
    - `quarter`: The target quarter (e.g. Q3 2024)
    """
    from services.earnings_analyzer import EarningsCallAnalyzer
    analyzer = EarningsCallAnalyzer()
    
    results = await analyzer.analyze_earnings_call(symbol, quarter)
    return results
