from typing import List, Dict, Any
import math

from .data_aggregator import aggregator, resolve_yf_symbol

INDICES = {
    "NIFTY 50":   "^NSEI",
    "SENSEX":     "^BSESN",
    "BANK NIFTY": "^NSEBANK",
    "NIFTY IT":   "^CNXIT",
    "S&P 500":    "^GSPC",
    "GOLD":       "GC=F",
    "CRUDE OIL":  "CL=F",
    "BTC/USD":    "BTC-USD",
    "USD/INR":    "INR=X",
}

_INDEX_SYMBOLS = set(INDICES.values())

def _safe_number(value: Any, default: float = 0.0) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    return number if math.isfinite(number) else default


def _is_inr_symbol(raw_symbol: str) -> bool:
    """Return True if the resolved ticker is an Indian equity (NSE/BSE)."""
    resolved = resolve_yf_symbol(raw_symbol)
    return resolved.endswith(".NS") or resolved.endswith(".BO")


async def get_indices() -> List[Dict[str, Any]]:
    """Fetch live index prices directly via yfinance (fast_info path, no aggregator)."""
    import asyncio
    import yfinance as yf

    results = []

    def _fetch_one(name: str, symbol: str) -> Dict[str, Any]:
        try:
            ticker = yf.Ticker(symbol)
            fi = ticker.fast_info
            current = getattr(fi, "last_price", None)
            prev_close = getattr(fi, "previous_close", None)

            # History fallback if fast_info gives nothing
            if not current:
                hist = ticker.history(period="2d", auto_adjust=True)
                if not hist.empty:
                    current = float(hist["Close"].iloc[-1])
                    prev_close = float(hist["Close"].iloc[-2]) if len(hist) > 1 else current

            if not current:
                return {"name": name, "symbol": symbol, "value": 0, "change_pct": 0.0, "up": True, "error": "No data"}

            current = round(_safe_number(current), 2)
            prev_close = round(_safe_number(prev_close, current), 2) if prev_close else current
            chg_pct = round(((current - prev_close) / prev_close) * 100, 2) if prev_close else 0.0
            return {
                "name": name,
                "symbol": symbol,
                "value": _safe_number(current),
                "change_pct": _safe_number(chg_pct),
                "up": chg_pct >= 0,
            }
        except Exception as e:
            return {"name": name, "symbol": symbol, "value": 0, "change_pct": 0.0, "up": True, "error": str(e)}

    # Fetch all tickers concurrently in thread pool
    loop = asyncio.get_event_loop()
    tasks = [loop.run_in_executor(None, _fetch_one, name, symbol) for name, symbol in INDICES.items()]
    results = list(await asyncio.gather(*tasks))
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
