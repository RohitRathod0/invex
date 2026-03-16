from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from slowapi import Limiter
from slowapi.util import get_remote_address
import pandas as pd
import numpy as np

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
def get_performance(user_id: str, period: str = "1M", db: Session = Depends(get_db)):
    # This is a mock API returns for the performance chart until real calculation built
    base_value: float = 100000.0
    from datetime import timedelta
    points = 30 if period == "1M" else 7 if period == "1W" else 90
    data = []
    
    for i in range(points):
        import random
        base_value += random.uniform(-1000, 1500)
        date = datetime.now() - timedelta(days=points - i)
        data.append({
            "date": date.strftime("%Y-%m-%d"),
            "value": round(base_value, 2)
        })
    return data

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
