from datetime import datetime, timedelta
import asyncio
from typing import List, Dict, Any

from .data_aggregator import aggregator

INDICES = {
    "NIFTY 50": "^NSEI",
    "SENSEX": "^BSESN",
    "BANK NIFTY": "^NSEBANK",
    "NIFTY IT": "^CNXIT",
    "GOLD": "GC=F",
    "USD/INR": "INR=X",
}

async def get_indices() -> List[Dict[str, Any]]:
    # The aggregator handles Redis caching natively.
    results = []
    for name, symbol in INDICES.items():
        data = await aggregator.get_price(symbol)
        if data:
            current = data.get("current_price", 0)
            prev_close = data.get("previous_close", current)
            chg_pct = ((current - prev_close) / prev_close) * 100 if prev_close else 0.0
            
            results.append({
                "name": name,
                "symbol": symbol,
                "value": current,
                "change_pct": chg_pct,
                "up": chg_pct >= 0,
            })
        else:
            results.append({
                "name": name,
                "symbol": symbol,
                "value": 0,
                "change_pct": 0,
                "up": True,
                "error": "Failed to fetch index"
            })
    return results

async def get_stock_price(symbols: list[str]) -> List[Dict[str, Any]]:
    results = []
    for symbol in symbols:
        # Ensure Indian stocks have .NS suffix if not provided and not an index
        query_symbol = symbol if symbol.endswith(".NS") or symbol.endswith(".BO") or symbol in INDICES.values() else f"{symbol}.NS"
        
        data = await aggregator.get_price(query_symbol)
        if data:
            current = data.get("current_price", 0)
            results.append({
                "symbol": symbol,
                "price": current,
                "currency": "INR" if ".NS" in query_symbol or ".BO" in query_symbol else "USD"
            })
        else:
            results.append({
                "symbol": symbol,
                "price": 0,
                "error": "Failed to fetch price"
            })
    return results

async def get_stock_history(symbol: str, period: str) -> List[Dict[str, Any]]:
    query_symbol = symbol if symbol.endswith(".NS") or symbol.endswith(".BO") or symbol in INDICES.values() else f"{symbol}.NS"
    
    # Mapping period for aggregator
    yf_period = "1mo"
    if period == "1W": yf_period = "5d"
    elif period == "1M": yf_period = "1mo"
    elif period == "3M": yf_period = "3mo"
    elif period == "1Y": yf_period = "1y"
    elif period == "ALL": yf_period = "max"
    
    data = await aggregator.get_history(query_symbol, range_str=yf_period)
    if data:
        return [{"date": item.get("date"), "value": float(item.get("close", 0))} for item in data]
    return []
