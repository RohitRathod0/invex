from datetime import datetime
from typing import Literal, Optional
import yfinance as yf
from langchain_core.tools import tool
from pydantic import BaseModel, Field
import json

# Map friendly names to Yahoo Finance tickers
SYMBOL_MAP = {
    "nifty": "^NSEI",
    "nifty50": "^NSEI",
    "nifty 50": "^NSEI",
    "sensex": "^BSESN",
    "bse sensex": "^BSESN",
    "gold": "GOLDBEES.NS",
    "goldbees": "GOLDBEES.NS",
    "banknifty": "^NSEBANK",
    "bank nifty": "^NSEBANK",
}

class HistoricalReturnsInput(BaseModel):
    symbol: str = Field(description="Asset name, e.g. 'nifty', 'sensex', 'gold', or a stock ticker like 'RELIANCE.NS'")
    start_date: str = Field(description="Start date in YYYY-MM-DD format")
    end_date: Optional[str] = Field(default=None, description="End date in YYYY-MM-DD format, defaults to today if omitted")
    invested_amount: float = Field(default=100000, description="Amount invested in INR")

@tool("get_historical_returns", args_schema=HistoricalReturnsInput)
def get_historical_returns(symbol: str, start_date: str, end_date: str = None, invested_amount: float = 100000):
    """
    Fetch REAL historical price data for an index/stock/ETF and compute
    actual CAGR, absolute return, and a monthly value curve for a lumpsum
    investment. Use this for ANY 'what if I invested X in Y on date Z' question.
    Never estimate these numbers yourself — always call this tool.
    """
    ticker_symbol = SYMBOL_MAP.get(symbol.lower().strip(), symbol.upper())
    end_date = end_date or datetime.today().strftime("%Y-%m-%d")

    ticker = yf.Ticker(ticker_symbol)
    hist = ticker.history(start=start_date, end=end_date, interval="1mo", auto_adjust=True)

    if hist.empty:
        return json.dumps({"error": f"No data found for {ticker_symbol} between {start_date} and {end_date}"})

    start_price = float(hist["Close"].iloc[0])
    end_price = float(hist["Close"].iloc[-1])
    start_dt = hist.index[0]
    end_dt = hist.index[-1]

    years = (end_dt - start_dt).days / 365.25
    units = invested_amount / start_price
    current_value = units * end_price

    absolute_return_pct = (end_price / start_price - 1) * 100
    cagr_pct = ((end_price / start_price) ** (1 / years) - 1) * 100 if years > 0 else 0

    chart_data = [
        {"date": dt.strftime("%b %Y"), "value": round(units * float(row["Close"]), 2)}
        for dt, row in hist.iterrows()
    ]

    return json.dumps({
        "symbol": ticker_symbol,
        "start_date": start_dt.strftime("%Y-%m-%d"),
        "end_date": end_dt.strftime("%Y-%m-%d"),
        "start_price": round(start_price, 2),
        "end_price": round(end_price, 2),
        "invested_amount": invested_amount,
        "current_value": round(current_value, 2),
        "absolute_return_pct": round(absolute_return_pct, 2),
        "cagr_pct": round(cagr_pct, 2),
        "years_held": round(years, 2),
        "chart_data": chart_data,
    })
