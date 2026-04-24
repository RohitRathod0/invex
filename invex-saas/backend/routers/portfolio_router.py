from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from slowapi import Limiter
from slowapi.util import get_remote_address
import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)

from models.database import get_db
from models.db_models import Holding
from services.backtesting_service import run_backtest

router = APIRouter(prefix="/portfolio", tags=["portfolio"])
limiter = Limiter(key_func=get_remote_address)

class BacktestStrategy(BaseModel):
    symbol: str
    start_date: str
    end_date: str
    initial_cash: float = 100000.0
    strategy_params: Optional[dict] = None

class HoldingBase(BaseModel):
    symbol: str
    exchange: str
    quantity: float
    avg_buy_price: float
    buy_date: datetime

class HoldingCreate(HoldingBase):
    pass

class HoldingUpdate(BaseModel):
    quantity: Optional[float] = None
    avg_buy_price: Optional[float] = None
    buy_date: Optional[datetime] = None

class HoldingResponse(HoldingBase):
    id: str
    user_id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# We assume user_id comes from a mock auth/session for now.
# Realistically would come from JWT or Session.
MOCK_USER_ID = "0000-user"

@router.get("/price-on-date")
@limiter.limit("30/minute")
async def get_price_on_date(
    request: Request,
    symbol: str,
    date: str,
    exchange: str = "NSE"
):
    """
    Fetch the closing price of a stock on a specific date using yfinance.
    Used by the Add Holding modal to auto-populate the buy price.
    """
    import yfinance as yf
    import asyncio
    from services.data_aggregator import resolve_yf_symbol

    # Resolve ticker — auto-adds .NS for Indian stocks
    # Override: if exchange is BSE, use .BO
    def _get_yf_symbol():
        s = symbol.strip().upper()
        if exchange.upper() == "BSE" and not s.endswith(".BO"):
            return s + ".BO"
        if exchange.upper() == "US":
            return s  # US ticker, no suffix
        return resolve_yf_symbol(s)

    yf_sym = _get_yf_symbol()
    is_inr = yf_sym.endswith(".NS") or yf_sym.endswith(".BO")

    def _fetch():
        try:
            import math
            from datetime import timedelta

            target = datetime.strptime(date, "%Y-%m-%d")
            # Fetch a 10-day window to cover weekends, holidays, and market closures
            start = (target - timedelta(days=10)).strftime("%Y-%m-%d")
            end   = (target + timedelta(days=2)).strftime("%Y-%m-%d")

            ticker = yf.Ticker(yf_sym)
            hist = ticker.history(start=start, end=end, auto_adjust=True)

            if hist.empty:
                return None, f"No data found for '{yf_sym}'. Check symbol and exchange."

            # DatetimeIndex uses .tz (not .tzinfo) — strip timezone so we can compare
            if hist.index.tz is not None:
                hist.index = hist.index.tz_localize(None)

            # Narrow to rows on or before the requested date
            hist = hist[hist.index <= target]
            if hist.empty:
                return None, f"No trading day found on or before {date} for {yf_sym}."

            raw_price = hist["Close"].iloc[-1]

            # Guard against NaN / 0 / Inf prices (can happen with bad yfinance data)
            if raw_price is None or (isinstance(raw_price, float) and (math.isnan(raw_price) or math.isinf(raw_price))):
                return None, f"Price data for {yf_sym} on {date} is invalid (NaN/Inf). Try a different date."
            if float(raw_price) <= 0:
                return None, f"Price data for {yf_sym} on {date} is zero or negative — data may be unavailable."

            price = round(float(raw_price), 2)
            actual_date = hist.index[-1].strftime("%Y-%m-%d")
            return {"price": price, "actual_date": actual_date, "currency": "INR" if is_inr else "USD"}, None

        except ValueError as ve:
            return None, f"Invalid date format '{date}'. Expected YYYY-MM-DD."
        except Exception as e:
            return None, f"Failed to fetch price for {yf_sym}: {str(e)}"

    result, error = await asyncio.to_thread(_fetch)

    if error or result is None:
        raise HTTPException(status_code=404, detail=error or "Price not found")

    return result

@router.get("/{user_id}", response_model=List[HoldingResponse])
@limiter.limit("30/minute")
def get_portfolio(request: Request, user_id: str, db: Session = Depends(get_db)):
    holdings = db.query(Holding).filter(Holding.user_id == user_id).all()
    return holdings

@router.post("/holding", response_model=HoldingResponse)
@limiter.limit("10/minute")
def add_holding(request: Request, holding: HoldingCreate, db: Session = Depends(get_db)):
    db_holding = Holding(
        user_id=MOCK_USER_ID,
        **holding.model_dump()
    )
    db.add(db_holding)
    db.commit()
    db.refresh(db_holding)
    return db_holding

@router.patch("/holding/{holding_id}", response_model=HoldingResponse)
@limiter.limit("10/minute")
def edit_holding(request: Request, holding_id: str, holding: HoldingUpdate, db: Session = Depends(get_db)):
    db_holding = db.query(Holding).filter(Holding.id == holding_id).first()
    if not db_holding:
        raise HTTPException(status_code=404, detail="Holding not found")
        
    update_data = holding.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_holding, key, value)
        
    db.commit()
    db.refresh(db_holding)
    return db_holding

@router.delete("/holding/{holding_id}")
@limiter.limit("10/minute")
def delete_holding(request: Request, holding_id: str, db: Session = Depends(get_db)):
    db_holding = db.query(Holding).filter(Holding.id == holding_id).first()
    if not db_holding:
        raise HTTPException(status_code=404, detail="Holding not found")
        
    db.delete(db_holding)
    db.commit()
    return {"status": "success"}



@router.get("/performance/{user_id}")

async def get_performance(user_id: str, period: str = "1M", db: Session = Depends(get_db)):
    """
    Returns real portfolio value timeseries by fetching historical closing prices
    from yfinance for each holding and computing daily portfolio value.
    """
    import asyncio
    import yfinance as yf
    from datetime import timedelta

    period_map = {"1W": "7d", "1M": "1mo", "3M": "3mo", "1Y": "1y"}
    yf_period = period_map.get(period, "1mo")

    holdings = db.query(Holding).filter(Holding.user_id == user_id).all()
    if not holdings:
        return []

    from services.data_aggregator import resolve_yf_symbol

    def fetch_history(symbol: str, exch: str, qty: float):
        ticker_sym = resolve_yf_symbol(symbol, exch)
        try:
            ticker = yf.Ticker(ticker_sym)
            hist = ticker.history(period=yf_period)
            if hist.empty:
                return None
            result = {}
            for date, row in hist.iterrows():
                date_str = date.strftime("%Y-%m-%d")
                result[date_str] = float(row["Close"]) * qty
            return result
        except Exception as e:
            return None

    # Run all fetches concurrently using threads
    loop = asyncio.get_event_loop()
    tasks = [
        loop.run_in_executor(None, fetch_history, h.symbol, h.exchange, h.quantity)
        for h in holdings
    ]
    results = await asyncio.gather(*tasks)

    # Merge: sum up portfolio value per date across all holdings
    portfolio_by_date: dict[str, float] = {}
    for result in results:
        if result:
            for date_str, value in result.items():
                portfolio_by_date[date_str] = portfolio_by_date.get(date_str, 0.0) + value

    if not portfolio_by_date:
        # Fallback: return invested value as flat line
        total_invested = sum(h.quantity * h.avg_buy_price for h in holdings)
        from datetime import timedelta
        points = {"1W": 7, "1M": 30, "3M": 90, "1Y": 365}.get(period, 30)
        return [
            {"date": (datetime.now() - timedelta(days=points - i)).strftime("%Y-%m-%d"),
             "value": round(total_invested, 2)}
            for i in range(points)
        ]

    # Sort by date and return
    sorted_data = [
        {"date": d, "value": round(v, 2)}
        for d, v in sorted(portfolio_by_date.items())
    ]
    return sorted_data

@router.post("/backtest/strategy")
@limiter.limit("5/minute")
async def backtest_strategy(request: Request, params: BacktestStrategy, db: Session = Depends(get_db)):
    """
    Simulate a strategy using historical data and AI buy/sell signals.
    """
    from services.data_aggregator import aggregator
    from datetime import datetime, timedelta
    
    # 1. Fetch historical data from the reliable aggregator
    hist_data = await aggregator.get_history(params.symbol, range_str="max")
    
    if not hist_data or len(hist_data) == 0:
        raise HTTPException(status_code=404, detail="Historical data not found for symbol")
        
    # 2. Convert to DataFrame required by backtesting.py
    # Expected: [Date, Open, High, Low, Close, Volume]
    df = pd.DataFrame(hist_data)
    
    # Rename 'close' to 'Close' for backtesting.py standard
    if 'close' in df.columns and 'Close' not in df.columns:
        df['Close'] = df['close']
    
    # Fake Open, High, Low, Volume if missing (since mock aggregator only gives close right now)
    if 'Open' not in df.columns: df['Open'] = df['Close']
    if 'High' not in df.columns: df['High'] = df['Close'] * 1.01
    if 'Low' not in df.columns: df['Low'] = df['Close'] * 0.99
    if 'Volume' not in df.columns: df['Volume'] = 1000000
    if 'date' in df.columns:
        df['Date'] = pd.to_datetime(df['date'])
        df.set_index('Date', inplace=True)
        
    # 3. Inject mock AI Signals (Random buys and sells for demonstration)
    # In a real app, this would query your AI prediction database
    import random
    np.random.seed(42) # For reproducible mock backtests
    signals = ['HOLD'] * len(df)
    
    # Generate ~5 trades on average
    for i in range(len(df)):
        if random.random() < 0.05:
            signals[i] = 'BUY'
        elif random.random() < 0.05:
            signals[i] = 'SELL'
            
    df['AI_Signal'] = signals
    
    # 4. Filter by date range
    try:
        start_date = pd.to_datetime(params.start_date)
        end_date = pd.to_datetime(params.end_date)
        df = df[(df.index >= start_date) & (df.index <= end_date)]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {e}")
        
    if len(df) < 10:
        raise HTTPException(status_code=400, detail="Not enough data points in the selected date range for a valid backtest (minimum 10 required).")

    # 5. Run the backtest engine
    results = run_backtest(df, initial_cash=params.initial_cash)
    
    if "error" in results:
        raise HTTPException(status_code=500, detail=f"Backtest engine failed: {results['error']}")
        
    return results

@router.get("/risk-analysis/{user_id}")
@limiter.limit("10/minute")
async def analyze_portfolio_risk(request: Request, user_id: str, db: Session = Depends(get_db)):
    """
    Calculate institutional-grade risk metrics for the user's current portfolio.
    """
    from services.risk_analytics import RiskAnalytics
    from services.data_aggregator import aggregator
    import pandas as pd
    import numpy as np
    
    # 1. Fetch user holdings
    holdings = db.query(Holding).filter(Holding.user_id == user_id).all()
    if not holdings:
        return {"error": "No holdings found to analyze"}
        
    # 2. Fetch historical returns for correlation matrix & VaR
    # (Fetching 1 year of data for each symbol)
    prices_dict = {}
    for h in holdings:
        hist = await aggregator.get_history(h.symbol, range_str="1y")
        if hist and len(hist) > 0:
            df = pd.DataFrame(hist)
            if 'date' in df.columns:
                df['Date'] = pd.to_datetime(df['date'])
                df.set_index('Date', inplace=True)
                prices_dict[h.symbol] = df['close'] if 'close' in df.columns else df['Close']
                
    if not prices_dict:
        raise HTTPException(status_code=500, detail="Could not retrieve market data for risk analysis")
        
    # Merge into a single dataframe of prices aligned by date
    portfolio_prices = pd.DataFrame(prices_dict).fillna(method='ffill').fillna(method='bfill')
    
    # Calculate daily percentage returns
    portfolio_returns = portfolio_prices.pct_change().dropna()
    
    # Calculate portfolio weights based on current invested amounts (simplistic approx for risk)
    # Ideally should use current market value, using qty * avg_price for simplicity here if current isn't instantly available
    total_invested = sum((h.quantity * h.avg_buy_price) for h in holdings)
    weights = np.array([ ((h.quantity * h.avg_buy_price) / total_invested) for h in holdings if h.symbol in portfolio_returns.columns ])
    
    # Re-align columns to match weights array just in case
    portfolio_returns = portfolio_returns[[h.symbol for h in holdings if h.symbol in portfolio_returns.columns]]
    
    # Weighted daily returns of the portfolio
    weighted_returns = (portfolio_returns * weights).sum(axis=1).values
    
    analytics = RiskAnalytics()
    
    risk_report = {
        'var_95': analytics.portfolio_var(weighted_returns, 0.95),
        'cvar_95': analytics.conditional_var(weighted_returns, 0.95),
        'sharpe_ratio': analytics.sharpe_ratio(weighted_returns),
        'sortino_ratio': analytics.sortino_ratio(weighted_returns),
        'max_drawdown': analytics.max_drawdown((1 + weighted_returns).cumprod() * 100),
        'correlation_analysis': analytics.correlation_matrix(portfolio_returns),
        'stress_test': analytics.stress_test(portfolio_prices, scenarios=['2020_covid_crash', '2008_financial_crisis'])
    }
    
    return risk_report

@router.get("/tax-optimization/{user_id}")
@limiter.limit("10/minute")
async def analyze_tax_optimization(request: Request, user_id: str, db: Session = Depends(get_db)):
    """
    Analyze portfolio for tax loss harvesting and STCG/LTCG optimizations.
    """
    from services.tax_optimizer import TaxOptimizer
    from services.data_aggregator import aggregator
    
    holdings = db.query(Holding).filter(Holding.user_id == user_id).all()
    if not holdings:
        return {"error": "No holdings found for tax analysis"}
        
    prices_dict = {}
    for h in holdings:
        data = await aggregator.get_price(h.symbol)
        if data:
            prices_dict[h.symbol] = data.get("current_price", h.avg_buy_price)
            
    optimizer = TaxOptimizer()
    
    harvesting = optimizer.identify_tax_loss_harvest_opportunities(holdings, prices_dict)
    timing = optimizer.optimize_sale_timing(holdings, prices_dict)
    liability = optimizer.calculate_tax_liability([], "FY2024-25")
    
    return {
        "tax_loss_harvesting": harvesting,
        "sale_timing_optimization": timing,
        "current_fy_liability": liability
    }

class MonteCarloRequest(BaseModel):
    years: float = 1.0
    simulations: int = 1000

@router.post("/stress-test/monte-carlo/{user_id}")
@limiter.limit("5/minute")
async def run_monte_carlo_stress_test(
    request: Request, 
    user_id: str, 
    params: MonteCarloRequest, 
    db: Session = Depends(get_db)
):
    """
    Run Monte Carlo simulations on the user's current portfolio to project future scenarios.
    """
    from services.portfolio_stress_test import PortfolioStressTester
    from services.data_aggregator import aggregator
    
    holdings = db.query(Holding).filter(Holding.user_id == user_id).all()
    if not holdings:
        raise HTTPException(status_code=400, detail="No holdings found to simulate")
        
    prices_dict = {}
    total_val = 0.0
    
    # 1. Gather current values and approximate historical returns
    for h in holdings:
        data = await aggregator.get_price(h.symbol)
        curr_price = data.get("current_price", h.avg_buy_price) if data else h.avg_buy_price
        total_val += curr_price * h.quantity
        
    if total_val == 0:
        raise HTTPException(status_code=400, detail="Portfolio value is zero")
        
    # In a real system, you'd calculate exact weighted expected return and volatility from history.
    # We will simulate generalized parameters based on average equity markets for demonstration
    # if full historical covariance is too heavy to calculate here.
    
    mock_expected_return = 0.12 # 12% annual return assumption for Indian equities
    mock_volatility = 0.18      # 18% annual volatility assumption
    
    tester = PortfolioStressTester()
    results = tester.run_monte_carlo(
        current_value=float(total_val), 
        expected_return=mock_expected_return, 
        volatility=mock_volatility, 
        years=params.years, 
        num_simulations=params.simulations
    )
    return results

class AnalyzeNewsRequest(BaseModel):
    query: Optional[str] = "Analyze the impact of today's news on my portfolio."
    chat_history: Optional[List[dict]] = None
    news_context: Optional[str] = None  # Pre-loaded news item from frontend @ citation

@router.post("/analyze-news/{user_id}")
@limiter.limit("10/minute")
async def analyze_portfolio_news(request: Request, user_id: str, payload: AnalyzeNewsRequest, db: Session = Depends(get_db)):
    """
    Invokes the LangGraph portfolio analyst to analyze market news impacts on the user's specific holdings.
    When news_context is provided (from @ citation), skips expensive RSS re-fetch.
    """
    from services.portfolio_analyst_agent import portfolio_analyst
    import traceback
    
    holdings = db.query(Holding).filter(Holding.user_id == user_id).all()
    
    if not holdings:
        portfolio_context = "User has no active holdings. Provide general market insight."
    else:
        context_lines = []
        for h in holdings:
            context_lines.append(f"- {h.quantity} shares of {h.symbol} at {h.avg_buy_price} (Exchange: {h.exchange})")
        portfolio_context = "\n".join(context_lines)
    
    try:
        result = await portfolio_analyst.run_analyst(
            user_query=payload.query,
            portfolio_context=portfolio_context,
            chat_history=payload.chat_history,
            news_data=payload.news_context,  # Pass cited news directly — skips RSS fetch
            user_id=user_id,                 # Enables compressed context injection
        )
        return result
    except Exception as e:
        logger.error(f"Portfolio analyst failed: {traceback.format_exc()}")
        return {
            "analysis": f"The portfolio analyst encountered an error. Please try again.\n\nDetails: {str(e)}",
            "is_complete": False,
            "attempts": 0
        }
