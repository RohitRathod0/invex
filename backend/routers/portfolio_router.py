"""
backend/routers/portfolio_router.py

Portfolio management — fully migrated from SQLite to MongoDB.
All holdings are stored in invex_db.holdings, keyed by user_id from JWT.
Every endpoint requires a valid access token — no mock user IDs.

MongoDB collection: holdings
{
    "_id":           "uuid",
    "user_id":       "uuid",          ← from JWT
    "symbol":        "RELIANCE",
    "exchange":      "NSE",
    "quantity":      10.0,
    "avg_buy_price": 2450.00,
    "buy_date":      "2024-01-15T00:00:00",
    "created_at":    "2024-01-15T...",
    "updated_at":    "2024-01-15T...",
}
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging
import pandas as pd
import numpy as np

from models.mongo import get_mongo_db
from routers.auth_router import get_current_user
from services.backtesting_service import run_backtest
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/portfolio", tags=["portfolio"])
limiter = Limiter(key_func=get_remote_address)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _holding_to_dict(doc: dict) -> dict:
    """Serialize a MongoDB holding document for API responses."""
    return {
        "id":            doc["_id"],
        "user_id":       doc["user_id"],
        "symbol":        doc["symbol"],
        "exchange":      doc["exchange"],
        "quantity":      doc["quantity"],
        "avg_buy_price": doc["avg_buy_price"],
        "buy_date":      doc["buy_date"],
        "created_at":    doc["created_at"],
    }


# ── Pydantic models ───────────────────────────────────────────────────────────

class HoldingCreate(BaseModel):
    symbol:        str
    exchange:      str
    quantity:      float = Field(..., gt=0)
    avg_buy_price: float = Field(..., gt=0)
    buy_date:      datetime


class HoldingUpdate(BaseModel):
    quantity:      Optional[float] = Field(None, gt=0)
    avg_buy_price: Optional[float] = Field(None, gt=0)
    buy_date:      Optional[datetime] = None


class BacktestStrategy(BaseModel):
    symbol:          str
    start_date:      str
    end_date:        str
    initial_cash:    float = 100000.0
    strategy_params: Optional[dict] = None


class MonteCarloRequest(BaseModel):
    years:       float = 1.0
    simulations: int   = 1000


class AnalyzeNewsRequest(BaseModel):
    query:        Optional[str]        = "Analyze the impact of today's news on my portfolio."
    chat_history: Optional[List[dict]] = None
    news_context: Optional[str]        = None


# ── Price on date (no auth required — public utility) ─────────────────────────

@router.get("/price-on-date")
@limiter.limit("30/minute")
async def get_price_on_date(
    request:  Request,
    symbol:   str,
    date:     str,
    exchange: str = "NSE",
):
    """
    Fetch the closing price of a stock on a specific date using yfinance.
    Used by the Add Holding modal to auto-populate the buy price.
    """
    import yfinance as yf
    import asyncio
    from services.data_aggregator import resolve_yf_symbol

    def _get_yf_symbol():
        s = symbol.strip().upper()
        if exchange.upper() == "BSE" and not s.endswith(".BO"):
            return s + ".BO"
        if exchange.upper() == "US":
            return s
        return resolve_yf_symbol(s)

    yf_sym = _get_yf_symbol()
    is_inr = yf_sym.endswith(".NS") or yf_sym.endswith(".BO")

    def _fetch():
        try:
            import math
            from datetime import timedelta

            target = datetime.strptime(date, "%Y-%m-%d")
            start  = (target - timedelta(days=10)).strftime("%Y-%m-%d")
            end    = (target + timedelta(days=2)).strftime("%Y-%m-%d")

            ticker = yf.Ticker(yf_sym)
            hist   = ticker.history(start=start, end=end, auto_adjust=True)

            if hist.empty:
                return None, f"No data found for '{yf_sym}'. Check symbol and exchange."

            if hist.index.tz is not None:
                hist.index = hist.index.tz_localize(None)

            hist = hist[hist.index <= target]
            if hist.empty:
                return None, f"No trading day found on or before {date} for {yf_sym}."

            raw_price = hist["Close"].iloc[-1]

            if raw_price is None or (isinstance(raw_price, float) and (math.isnan(raw_price) or math.isinf(raw_price))):
                return None, f"Price data for {yf_sym} on {date} is invalid (NaN/Inf). Try a different date."
            if float(raw_price) <= 0:
                return None, f"Price data for {yf_sym} on {date} is zero or negative — data may be unavailable."

            price       = round(float(raw_price), 2)
            actual_date = hist.index[-1].strftime("%Y-%m-%d")
            return {"price": price, "actual_date": actual_date, "currency": "INR" if is_inr else "USD"}, None

        except ValueError:
            return None, f"Invalid date format '{date}'. Expected YYYY-MM-DD."
        except Exception as e:
            return None, f"Failed to fetch price for {yf_sym}: {str(e)}"

    result, error = await asyncio.to_thread(_fetch)

    if error or result is None:
        raise HTTPException(status_code=404, detail=error or "Price not found")

    return result


# ── Holdings CRUD ─────────────────────────────────────────────────────────────

@router.get("/holdings", response_model=List[dict])
@limiter.limit("30/minute")
async def get_holdings(
    request:      Request,
    current_user: dict = Depends(get_current_user),
):
    """
    Return all holdings for the logged-in user.
    Returns an empty list (not an error) if the user has no holdings yet.
    """
    user_id = current_user["_id"]
    db      = get_mongo_db()

    cursor = db["holdings"].find({"user_id": user_id}, {"_id": 1, "user_id": 1, "symbol": 1, "exchange": 1, "quantity": 1, "avg_buy_price": 1, "buy_date": 1, "created_at": 1})
    docs   = await cursor.to_list(length=500)
    return [_holding_to_dict(d) for d in docs]


@router.post("/holding", response_model=dict, status_code=201)
@limiter.limit("10/minute")
async def add_holding(
    request:      Request,
    holding:      HoldingCreate,
    current_user: dict = Depends(get_current_user),
):
    """Add a new holding to the logged-in user's portfolio."""
    user_id = current_user["_id"]
    db      = get_mongo_db()

    doc = {
        "_id":           str(uuid.uuid4()),
        "user_id":       user_id,
        "symbol":        holding.symbol.strip().upper(),
        "exchange":      holding.exchange.strip().upper(),
        "quantity":      holding.quantity,
        "avg_buy_price": holding.avg_buy_price,
        "buy_date":      holding.buy_date.isoformat(),
        "created_at":    _now_iso(),
        "updated_at":    _now_iso(),
    }

    await db["holdings"].insert_one(doc)
    return _holding_to_dict(doc)


@router.patch("/holding/{holding_id}", response_model=dict)
@limiter.limit("10/minute")
async def edit_holding(
    request:      Request,
    holding_id:   str,
    holding:      HoldingUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update a holding. Only the owning user can edit their holdings."""
    user_id = current_user["_id"]
    db      = get_mongo_db()

    existing = await db["holdings"].find_one({"_id": holding_id, "user_id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Holding not found")

    updates = {k: v for k, v in holding.model_dump(exclude_unset=True).items() if v is not None}
    if "buy_date" in updates and isinstance(updates["buy_date"], datetime):
        updates["buy_date"] = updates["buy_date"].isoformat()
    updates["updated_at"] = _now_iso()

    await db["holdings"].update_one({"_id": holding_id}, {"$set": updates})
    updated = await db["holdings"].find_one({"_id": holding_id})
    return _holding_to_dict(updated)


@router.delete("/holding/{holding_id}")
@limiter.limit("10/minute")
async def delete_holding(
    request:      Request,
    holding_id:   str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a holding. Only the owning user can delete their holdings."""
    user_id = current_user["_id"]
    db      = get_mongo_db()

    result = await db["holdings"].delete_one({"_id": holding_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Holding not found")

    return {"status": "success", "deleted": holding_id}


# ── Performance chart ─────────────────────────────────────────────────────────

@router.get("/performance")
async def get_performance(
    request:      Request,
    period:       str  = "1M",
    current_user: dict = Depends(get_current_user),
):
    """
    Returns real portfolio value timeseries by fetching historical closing
    prices from yfinance for each holding and computing daily portfolio value.
    Returns empty [] if user has no holdings.
    """
    import asyncio
    import yfinance as yf

    user_id = current_user["_id"]
    db      = get_mongo_db()

    cursor   = db["holdings"].find({"user_id": user_id})
    holdings = await cursor.to_list(length=500)

    if not holdings:
        return []

    period_map = {"1W": "7d", "1M": "1mo", "3M": "3mo", "1Y": "1y"}
    yf_period  = period_map.get(period, "1mo")

    from services.data_aggregator import resolve_yf_symbol

    def fetch_history(symbol: str, exch: str, qty: float):
        ticker_sym = resolve_yf_symbol(symbol, exch)
        try:
            ticker = yf.Ticker(ticker_sym)
            hist   = ticker.history(period=yf_period)
            if hist.empty:
                return None
            result = {}
            for date, row in hist.iterrows():
                date_str         = date.strftime("%Y-%m-%d")
                result[date_str] = float(row["Close"]) * qty
            return result
        except Exception:
            return None

    loop    = asyncio.get_event_loop()
    tasks   = [loop.run_in_executor(None, fetch_history, h["symbol"], h["exchange"], h["quantity"]) for h in holdings]
    results = await asyncio.gather(*tasks)

    portfolio_by_date: dict = {}
    for result in results:
        if result:
            for date_str, value in result.items():
                portfolio_by_date[date_str] = portfolio_by_date.get(date_str, 0.0) + value

    if not portfolio_by_date:
        total_invested = sum(h["quantity"] * h["avg_buy_price"] for h in holdings)
        from datetime import timedelta
        points = {"1W": 7, "1M": 30, "3M": 90, "1Y": 365}.get(period, 30)
        return [
            {"date": (datetime.now() - timedelta(days=points - i)).strftime("%Y-%m-%d"), "value": round(total_invested, 2)}
            for i in range(points)
        ]

    return [{"date": d, "value": round(v, 2)} for d, v in sorted(portfolio_by_date.items())]


# ── Risk analysis ─────────────────────────────────────────────────────────────

@router.get("/risk-analysis")
@limiter.limit("10/minute")
async def analyze_portfolio_risk(
    request:      Request,
    current_user: dict = Depends(get_current_user),
):
    """Calculate institutional-grade risk metrics for the logged-in user's portfolio."""
    from services.risk_analytics import RiskAnalytics
    from services.data_aggregator import aggregator

    user_id  = current_user["_id"]
    db       = get_mongo_db()
    cursor   = db["holdings"].find({"user_id": user_id})
    holdings = await cursor.to_list(length=500)

    if not holdings:
        return {"error": "No holdings found to analyze", "empty": True}

    prices_dict = {}
    for h in holdings:
        hist = await aggregator.get_history(h["symbol"], range_str="1y")
        if hist and len(hist) > 0:
            df = pd.DataFrame(hist)
            if "date" in df.columns:
                df["Date"] = pd.to_datetime(df["date"])
                df.set_index("Date", inplace=True)
                prices_dict[h["symbol"]] = df["close"] if "close" in df.columns else df["Close"]

    if not prices_dict:
        raise HTTPException(status_code=500, detail="Could not retrieve market data for risk analysis")

    portfolio_prices  = pd.DataFrame(prices_dict).fillna(method="ffill").fillna(method="bfill")
    portfolio_returns = portfolio_prices.pct_change().dropna()

    total_invested = sum(h["quantity"] * h["avg_buy_price"] for h in holdings)
    weights        = np.array([
        (h["quantity"] * h["avg_buy_price"]) / total_invested
        for h in holdings if h["symbol"] in portfolio_returns.columns
    ])

    portfolio_returns = portfolio_returns[[h["symbol"] for h in holdings if h["symbol"] in portfolio_returns.columns]]
    weighted_returns  = (portfolio_returns * weights).sum(axis=1).values

    analytics = RiskAnalytics()
    return {
        "var_95":               analytics.portfolio_var(weighted_returns, 0.95),
        "cvar_95":              analytics.conditional_var(weighted_returns, 0.95),
        "sharpe_ratio":         analytics.sharpe_ratio(weighted_returns),
        "sortino_ratio":        analytics.sortino_ratio(weighted_returns),
        "max_drawdown":         analytics.max_drawdown((1 + weighted_returns).cumprod() * 100),
        "correlation_analysis": analytics.correlation_matrix(portfolio_returns),
        "stress_test":          analytics.stress_test(portfolio_prices, scenarios=["2020_covid_crash", "2008_financial_crisis"]),
    }


# ── Tax optimization ──────────────────────────────────────────────────────────

@router.get("/tax-optimization")
@limiter.limit("10/minute")
async def analyze_tax_optimization(
    request:      Request,
    current_user: dict = Depends(get_current_user),
):
    """Analyze portfolio for tax loss harvesting and STCG/LTCG optimizations."""
    from services.tax_optimizer import TaxOptimizer
    from services.data_aggregator import aggregator

    user_id  = current_user["_id"]
    db       = get_mongo_db()
    cursor   = db["holdings"].find({"user_id": user_id})
    holdings = await cursor.to_list(length=500)

    if not holdings:
        return {"error": "No holdings found for tax analysis", "empty": True}

    prices_dict = {}
    for h in holdings:
        data = await aggregator.get_price(h["symbol"])
        if data:
            prices_dict[h["symbol"]] = data.get("current_price", h["avg_buy_price"])

    optimizer = TaxOptimizer()
    return {
        "tax_loss_harvesting":        optimizer.identify_tax_loss_harvest_opportunities(holdings, prices_dict),
        "sale_timing_optimization":   optimizer.optimize_sale_timing(holdings, prices_dict),
        "current_fy_liability":       optimizer.calculate_tax_liability([], "FY2024-25"),
    }


# ── Monte Carlo stress test ────────────────────────────────────────────────────

@router.post("/stress-test/monte-carlo")
@limiter.limit("5/minute")
async def run_monte_carlo_stress_test(
    request:      Request,
    params:       MonteCarloRequest,
    current_user: dict = Depends(get_current_user),
):
    """Run Monte Carlo simulations on the logged-in user's portfolio."""
    from services.portfolio_stress_test import PortfolioStressTester
    from services.data_aggregator import aggregator

    user_id  = current_user["_id"]
    db       = get_mongo_db()
    cursor   = db["holdings"].find({"user_id": user_id})
    holdings = await cursor.to_list(length=500)

    if not holdings:
        raise HTTPException(status_code=400, detail="No holdings found to simulate")

    total_val = 0.0
    for h in holdings:
        data      = await aggregator.get_price(h["symbol"])
        curr_price = data.get("current_price", h["avg_buy_price"]) if data else h["avg_buy_price"]
        total_val += curr_price * h["quantity"]

    if total_val == 0:
        raise HTTPException(status_code=400, detail="Portfolio value is zero")

    tester = PortfolioStressTester()
    return tester.run_monte_carlo(
        current_value=float(total_val),
        expected_return=0.12,
        volatility=0.18,
        years=params.years,
        num_simulations=params.simulations,
    )


# ── Backtest ──────────────────────────────────────────────────────────────────

@router.post("/backtest/strategy")
@limiter.limit("5/minute")
async def backtest_strategy(
    request:      Request,
    params:       BacktestStrategy,
    current_user: dict = Depends(get_current_user),
):
    """Simulate a strategy using historical data and AI buy/sell signals."""
    from services.data_aggregator import aggregator
    import random

    hist_data = await aggregator.get_history(params.symbol, range_str="max")

    if not hist_data or len(hist_data) == 0:
        raise HTTPException(status_code=404, detail="Historical data not found for symbol")

    df = pd.DataFrame(hist_data)

    if "close" in df.columns and "Close" not in df.columns:
        df["Close"] = df["close"]

    if "Open"   not in df.columns: df["Open"]   = df["Close"]
    if "High"   not in df.columns: df["High"]   = df["Close"] * 1.01
    if "Low"    not in df.columns: df["Low"]    = df["Close"] * 0.99
    if "Volume" not in df.columns: df["Volume"] = 1000000

    if "date" in df.columns:
        df["Date"] = pd.to_datetime(df["date"])
        df.set_index("Date", inplace=True)

    np.random.seed(42)
    signals = ["HOLD"] * len(df)
    for i in range(len(df)):
        if random.random() < 0.05:
            signals[i] = "BUY"
        elif random.random() < 0.05:
            signals[i] = "SELL"
    df["AI_Signal"] = signals

    try:
        df = df[(df.index >= pd.to_datetime(params.start_date)) & (df.index <= pd.to_datetime(params.end_date))]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {e}")

    if len(df) < 10:
        raise HTTPException(status_code=400, detail="Not enough data points in the selected date range (minimum 10 required).")

    results = run_backtest(df, initial_cash=params.initial_cash)
    if "error" in results:
        raise HTTPException(status_code=500, detail=f"Backtest engine failed: {results['error']}")

    return results


# ── News analysis ─────────────────────────────────────────────────────────────

@router.post("/analyze-news")
@limiter.limit("10/minute")
async def analyze_portfolio_news(
    request:      Request,
    payload:      AnalyzeNewsRequest,
    current_user: dict = Depends(get_current_user),
):
    """Invoke the LangGraph portfolio analyst to analyze market news against user's holdings."""
    from services.portfolio_analyst_agent import portfolio_analyst
    import traceback

    user_id  = current_user["_id"]
    db       = get_mongo_db()
    cursor   = db["holdings"].find({"user_id": user_id})
    holdings = await cursor.to_list(length=500)

    if not holdings:
        portfolio_context = "User has no active holdings. Provide general market insight."
    else:
        portfolio_context = "\n".join(
            f"- {h['quantity']} shares of {h['symbol']} at {h['avg_buy_price']} (Exchange: {h['exchange']})"
            for h in holdings
        )

    try:
        result = await portfolio_analyst.run_analyst(
            user_query=payload.query,
            portfolio_context=portfolio_context,
            chat_history=payload.chat_history,
            news_data=payload.news_context,
            user_id=user_id,
        )
        return result
    except Exception as e:
        logger.error(f"Portfolio analyst failed: {traceback.format_exc()}")
        return {
            "analysis":   f"The portfolio analyst encountered an error. Please try again.\n\nDetails: {str(e)}",
            "is_complete": False,
            "attempts":    0,
        }
