from typing import List, Dict, Any

from .data_aggregator import aggregator, resolve_yf_symbol

INDICES = {
    "NIFTY 50": "^NSEI",
    "SENSEX": "^BSESN",
    "BANK NIFTY": "^NSEBANK",
    "NIFTY IT": "^CNXIT",
    "GOLD": "GC=F",
    "USD/INR": "INR=X",
}

_INDEX_SYMBOLS = set(INDICES.values())


def _is_inr_symbol(raw_symbol: str) -> bool:
    """Return True if the resolved ticker is an Indian equity (NSE/BSE)."""
    resolved = resolve_yf_symbol(raw_symbol)
    return resolved.endswith(".NS") or resolved.endswith(".BO")


async def get_indices() -> List[Dict[str, Any]]:
    results = []
    for name, symbol in INDICES.items():
        try:
            data = await aggregator.get_price(symbol)
            if data:
                current = data.get("current_price") or 0.0
                prev_close = data.get("previous_close") or current
                chg_pct = ((current - prev_close) / prev_close) * 100 if prev_close else 0.0
                results.append({
                    "name": name,
                    "symbol": symbol,
                    "value": current,
                    "change_pct": round(chg_pct, 2),
                    "up": chg_pct >= 0,
                })
            else:
                results.append({
                    "name": name,
                    "symbol": symbol,
                    "value": 0,
                    "change_pct": 0.0,
                    "up": True,
                    "error": "Failed to fetch index",
                })
        except Exception as e:
            results.append({
                "name": name,
                "symbol": symbol,
                "value": 0,
                "change_pct": 0.0,
                "up": True,
                "error": str(e),
            })
    return results


async def get_stock_price(symbols: List[str]) -> List[Dict[str, Any]]:
    """
    Fetch current prices for a list of symbols.
    Each entry can be bare (e.g. 'RELIANCE') or include an exchange hint
    separated by '|' (e.g. 'TSLA|US', 'RELIANCE|NSE', 'INFY|BSE').
    The exchange hint is used to resolve the correct yfinance ticker so
    ANY stock listed globally works without a hardcoded lookup table.
    """
    results = []
    for entry in symbols:
        # Parse optional exchange hint
        if '|' in entry:
            raw_symbol, exch_hint = entry.split('|', 1)
        else:
            raw_symbol, exch_hint = entry, ''

        yf_sym = resolve_yf_symbol(raw_symbol, exch_hint)
        is_inr = yf_sym.endswith(".NS") or yf_sym.endswith(".BO")

        data = await aggregator.get_price(yf_sym)
        if data:
            current   = data.get("current_price", 0)
            prev_close = data.get("previous_close", current)
            chg_pct   = ((current - prev_close) / prev_close) * 100 if prev_close else 0.0
            results.append({
                "symbol":       raw_symbol,
                "price":        current,
                "previous_close": prev_close,
                "change_pct":   round(chg_pct, 2),
                "currency":     "INR" if is_inr else "USD",
                "source":       data.get("source", "yfinance"),
            })
        else:
            results.append({
                "symbol":     raw_symbol,
                "price":      0,
                "change_pct": 0.0,
                "currency":   "INR" if resolve_yf_symbol(raw_symbol, exch_hint).endswith((".NS", ".BO")) else "USD",
                "error":      "Failed to fetch price",
            })
    return results


async def get_stock_history(symbol: str, period: str) -> List[Dict[str, Any]]:
    """
    Fetch OHLCV history for a symbol.
    Symbol can be bare (e.g. 'RELIANCE') or include an exchange hint
    separated by '|' (e.g. 'TSLA|US', 'RELIANCE|NSE', 'INFY|BSE').
    Returns list of { date, value (=close), open, high, low, volume }.
    """
    # Parse optional exchange hint
    if '|' in symbol:
        raw_symbol, exch_hint = symbol.split('|', 1)
    else:
        raw_symbol, exch_hint = symbol, ''

    yf_sym = resolve_yf_symbol(raw_symbol, exch_hint)

    # Period strings are passed through to the aggregator which maps them internally
    data = await aggregator.get_history(yf_sym, range_str=period)
    if data:
        return [
            {
                "date": item.get("date"),
                "value": float(item.get("close", 0)),
                "open":  float(item.get("open", 0)),
                "high":  float(item.get("high", 0)),
                "low":   float(item.get("low", 0)),
                "volume": item.get("volume", 0),
            }
            for item in data
            if item.get("close", 0) > 0
        ]
    return []
