from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from typing import List
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/insider", tags=["insider-trading"])
limiter = Limiter(key_func=get_remote_address)

# Default watchlist for the scanner
DEFAULT_WATCHLIST = [
    "RELIANCE", "TCS", "INFY", "HDFC", "WIPRO",
    "ICICIBANK", "HCLTECH", "BHARTIARTL", "LT", "ASIANPAINT",
]


@router.get("/trades/{symbol}")
@limiter.limit("20/minute")
async def get_insider_trades(
    request: Request,
    symbol: str,
    days_back: int = Query(90, ge=7, le=365, description="Look-back window in days"),
):
    """
    Fetch and analyse insider trading patterns for a given NSE symbol.
    Returns overall signal (BULLISH / BEARISH / NEUTRAL), confidence score,
    detected patterns, and the individual trade ledger.
    """
    try:
        from services.insider_tracker import InsiderTradingDetector
        detector = InsiderTradingDetector()
        result = await detector.fetch_insider_trades(symbol.upper(), days_back)
        return result
    except Exception as e:
        logger.exception("insider trades error")
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/watchlist")
@limiter.limit("10/minute")
async def scan_watchlist(
    request: Request,
    symbols: str = Query(
        default=",".join(DEFAULT_WATCHLIST),
        description="Comma-separated NSE symbols to scan",
    ),
):
    """
    Scan a list of symbols and rank them by insider activity strength.
    Returns a summary card for each symbol sorted by bullishness.
    """
    try:
        from services.insider_tracker import InsiderTradingDetector
        sym_list = [s.strip().upper() for s in symbols.split(",") if s.strip()][:20]
        detector = InsiderTradingDetector()
        results = await detector.fetch_watchlist_summary(sym_list)
        return {"results": results, "scanned": len(sym_list)}
    except Exception as e:
        logger.exception("watchlist scan error")
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/backtest/{symbol}")
@limiter.limit("10/minute")
async def backtest_insider_signals(
    request: Request,
    symbol: str,
    years_back: int = Query(2, ge=1, le=5, description="Years of historical data"),
):
    """
    Backtest how accurate insider buy signals have been for a given symbol.
    Returns win rates and average returns at 7d / 30d / 90d horizons.
    """
    try:
        from services.insider_tracker import InsiderTradingDetector
        detector = InsiderTradingDetector()
        result = await detector.backtest_insider_signals(symbol.upper(), years_back)
        return result
    except Exception as e:
        logger.exception("backtest error")
        return JSONResponse(status_code=500, content={"error": str(e)})
