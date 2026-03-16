import yfinance as yf
from datetime import datetime, timedelta
import asyncio

# Simple in-memory cache to avoid rate limits
CACHE = {}
CACHE_TTL = timedelta(seconds=15) # 15 seconds for prices
HISTORY_TTL = timedelta(hours=1)  # 1 hour for history

INDICES = {
    "NIFTY 50": "^NSEI",
    "SENSEX": "^BSESN",
    "BANK NIFTY": "^NSEBANK",
    "NIFTY IT": "^CNXIT",
    "GOLD": "GC=F",
    "USD/INR": "INR=X",
}

def _get_from_cache(key):
    if key in CACHE:
        val, expiry = CACHE[key]
        if datetime.now() < expiry:
            return val
    return None

def _set_cache(key, value, ttl=CACHE_TTL):
    CACHE[key] = (value, datetime.now() + ttl)

async def get_indices():
    cached = _get_from_cache("indices")
    if cached: return cached

    results = []
    for name, symbol in INDICES.items():
        try:
            ticker = yf.Ticker(symbol)
            # Use fast_info if available (newer versions of yfinance)
            fast_info = ticker.fast_info
            current = fast_info.last_price
            prev_close = fast_info.previous_close
            
            chg_pct = 0.0
            if prev_close and prev_close > 0:
                chg_pct = ((current - prev_close) / prev_close) * 100

            results.append({
                "name": name,
                "symbol": symbol,
                "value": current,
                "change_pct": chg_pct,
                "up": chg_pct >= 0,
            })
        except Exception as e:
            # Fallback
            results.append({
                "name": name,
                "symbol": symbol,
                "value": 0,
                "change_pct": 0,
                "up": True,
                "error": str(e)
            })

    _set_cache("indices", results)
    return results

async def get_stock_price(symbols: list[str]):
    cache_key = f"price_{','.join(sorted(symbols))}"
    cached = _get_from_cache(cache_key)
    if cached: return cached

    results = []
    for symbol in symbols:
        try:
            # Ensure Indian stocks have .NS suffix if not provided and not an index
            query_symbol = symbol if symbol.endswith(".NS") or symbol.endswith(".BO") or symbol in INDICES.values() else f"{symbol}.NS"
            ticker = yf.Ticker(query_symbol)
            fast_info = ticker.fast_info
            
            results.append({
                "symbol": symbol,
                "price": fast_info.last_price,
                "currency": fast_info.currency
            })
        except Exception:
            results.append({
                "symbol": symbol,
                "price": 0,
                "error": "Failed to fetch price"
            })
            
    _set_cache(cache_key, results)
    return results

async def get_stock_history(symbol: str, period: str):
    cache_key = f"hist_{symbol}_{period}"
    cached = _get_from_cache(cache_key)
    if cached: return cached
    
    try:
        query_symbol = symbol if symbol.endswith(".NS") or symbol.endswith(".BO") or symbol in INDICES.values() else f"{symbol}.NS"
        ticker = yf.Ticker(query_symbol)
        
        # Mapping period
        yf_period = "1mo"
        if period == "1W": yf_period = "5d"
        elif period == "1M": yf_period = "1mo"
        elif period == "3M": yf_period = "3mo"
        elif period == "1Y": yf_period = "1y"
        elif period == "ALL": yf_period = "max"
        
        hist = ticker.history(period=yf_period)
        
        data = []
        for index, row in hist.iterrows():
            data.append({
                "date": index.strftime("%Y-%m-%d"),
                "value": float(row["Close"])
            })
            
        _set_cache(cache_key, data, HISTORY_TTL)
        return data
    except Exception as e:
        return []
