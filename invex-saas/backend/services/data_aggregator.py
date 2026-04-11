import asyncio
import logging
from typing import Dict, Any, List, Optional
import os
import requests

from .cache_manager import cache
from .data_validator import DataValidator

logger = logging.getLogger("invex.aggregator")

# Special-character patterns that are always exchange-qualified already
_SPECIAL_PREFIXES = ("^",)
_SPECIAL_SUFFIXES = ("=F", "-USD", "=X", ".NS", ".BO")


def resolve_yf_symbol(symbol: str, exchange: str = "") -> str:
    """
    Convert a raw user symbol + optional exchange into the correct Yahoo Finance ticker.

    Priority:
      1. Already-qualified symbols (contains . or special chars) → unchanged
      2. Explicit exchange override:
           US / NYSE / NASDAQ  → bare symbol (no suffix)
           BSE                 → symbol + .BO
           NSE (or blank)      → symbol + .NS   (Indian default)
      3. Heuristic fallback for indices / commodities / forex / crypto
         (recognised by leading ^ or trailing =F / -USD / =X)
    """
    s = symbol.strip().upper()
    exch = exchange.strip().upper()

    # Already fully-qualified
    if s.endswith(".NS") or s.endswith(".BO"):
        return s
    if any(s.startswith(p) for p in _SPECIAL_PREFIXES):
        return s
    if any(s.endswith(sfx) for sfx in _SPECIAL_SUFFIXES):
        return s

    # Explicit exchange overrides — covers any company on that exchange
    if exch in ("US", "NYSE", "NASDAQ", "AMEX"):
        return s          # US equities — no suffix needed
    if exch == "BSE":
        return s + ".BO"  # Bombay Stock Exchange

    # Default → NSE (covers NSE, blank, or unknown Indian exchange)
    return s + ".NS"



class DataAggregator:
    """
    Fetches real market data via yfinance with Redis caching and graceful fallbacks.
    All simulated / mock data has been removed.
    """

    # ---------- Public API ----------

    async def get_price(self, symbol: str) -> Optional[Dict[str, Any]]:
        cache_key = f"price_v2_{symbol}"

        cached = await cache.get(cache_key)
        if cached:
            logger.debug(f"Cache HIT for {symbol} price.")
            return cached

        logger.debug(f"Cache MISS for {symbol}. Attempting to fetch real price...")
        
        data = None
        # Primary: Try yfinance first with simple retry
        for attempt in range(2):
            try:
                data = await asyncio.to_thread(self._yf_get_price, symbol)
                if data:
                    break
            except Exception as e:
                logger.warning(f"yfinance attempt {attempt+1} failed: {e}")
            await asyncio.sleep(min((attempt + 1) * 0.5, 2))  # Exponential backoff

        # Secondary fallback: Alpha Vantage or Polygon if implemented later
        if not data:
            logger.warning(f"yfinance completely failed for {symbol}. Falling back to Alpha Vantage...")
            data = await asyncio.to_thread(self._av_get_price, symbol)

        if data:
            is_valid = DataValidator.validate_price(
                symbol=symbol,
                current_price=data.get("current_price", 0),
                previous_close=data.get("previous_close", 1),
            )
            if is_valid:
                await cache.set(cache_key, data, expire_seconds=300) # 5 min cache as per Master Plan
                return data
            else:
                logger.error(f"Data validation failed for {symbol} — price={data.get('current_price')}")
                return None

        logger.error(f"All data sources failed to fetch price for {symbol}")
        return None

    async def get_history(self, symbol: str, range_str: str = "1mo") -> Optional[List[Dict[str, Any]]]:
        cache_key = f"history_v2_{symbol}_{range_str}"

        cached = await cache.get(cache_key)
        if cached:
            return cached

        data = await asyncio.to_thread(self._yf_get_history, symbol, range_str)

        if data:
            clean = DataValidator.sanitize_history(data)
            if clean:
                await cache.set(cache_key, clean, expire_seconds=3600)
                return clean

        return None

    # ---------- Real yfinance helpers (run in thread pool) ----------

    def _yf_get_price(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Fetch current price from Yahoo Finance."""
        try:
            import yfinance as yf
            yf_sym = symbol # already resolved by caller
            ticker = yf.Ticker(yf_sym)

            # fast_info is the fastest path (no full download)
            fi = ticker.fast_info
            current = getattr(fi, "last_price", None)
            prev_close = getattr(fi, "previous_close", None)

            # Fallback: last 2 trading days history
            if current is None or current == 0:
                hist = ticker.history(period="2d", auto_adjust=True)
                if hist.empty:
                    logger.warning(f"yfinance: no data for {yf_sym}")
                    return None
                current = float(hist["Close"].iloc[-1])
                prev_close = float(hist["Close"].iloc[-2]) if len(hist) > 1 else current

            current = round(float(current), 2)
            prev_close = round(float(prev_close), 2) if prev_close else current

            logger.info(f"yfinance price OK: {yf_sym} → {current} (prev {prev_close})")
            return {
                "symbol": symbol,
                "yf_symbol": yf_sym,
                "current_price": current,
                "previous_close": prev_close,
                "source": "yfinance",
            }
        except Exception as e:
            logger.error(f"yfinance price fetch failed for {symbol}: {e}")
            return None

    def _yf_get_history(self, symbol: str, range_str: str) -> Optional[List[Dict[str, Any]]]:
        """
        Fetch OHLCV history from Yahoo Finance.
        range_str can be yfinance period strings like '5d', '1mo', '3mo', '1y', 'max'
        or our internal strings like '1W', '1M', '3M', '1Y'.
        """
        # Internal period → yfinance period mapping
        period_map = {
            "1W": "5d",
            "1M": "1mo",
            "3M": "3mo",
            "6M": "6mo",
            "1Y": "1y",
            "5Y": "5y",
            "ALL": "max",
        }
        yf_period = period_map.get(range_str.upper(), range_str)

        try:
            import yfinance as yf
            yf_sym = symbol # already resolved by caller
            ticker = yf.Ticker(yf_sym)
            hist = ticker.history(period=yf_period, auto_adjust=True)

            if hist.empty:
                logger.warning(f"yfinance history empty for {yf_sym} / period={yf_period}")
                return None

            result = []
            for ts, row in hist.iterrows():
                result.append({
                    "date": ts.strftime("%Y-%m-%d"),
                    "open": round(float(row["Open"]), 2),
                    "high": round(float(row["High"]), 2),
                    "low": round(float(row["Low"]), 2),
                    "close": round(float(row["Close"]), 2),
                    "volume": int(row.get("Volume", 0)),
                })

            logger.info(f"yfinance history OK: {yf_sym} / {yf_period} → {len(result)} rows")
            return result
        except Exception as e:
            logger.error(f"yfinance history fetch failed for {symbol}: {e}")
            return None

    def _av_get_price(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Alpha Vantage Fallback API."""
        api_key = os.environ.get("ALPHA_VANTAGE_API_KEY")
        if not api_key:
            logger.error("ALPHA_VANTAGE_API_KEY not found in environment for fallback.")
            return None
            
        # Strip internal suffix overrides to guess AV's suffix
        av_symbol = symbol.replace('.BO', '.BSE').replace('.NS', '.BSE') # AV uses .BSE for India
        if ".NS" in symbol:
            logger.warning(f"Alpha Vantage has limited NSE free coverage, converting {symbol} to BSE mapping if applicable")

        url = f"https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={av_symbol}&apikey={api_key}"
        try:
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                quote = data.get("Global Quote", {})
                if not quote:
                    logger.error(f"Alpha Vantage returned empty quote for {av_symbol}")
                    return None
                    
                current = round(float(quote.get("05. price", 0)), 2)
                prev_close = round(float(quote.get("08. previous close", 0)), 2)
                
                logger.info(f"Alpha Vantage fetch OK: {av_symbol} -> {current}")
                return {
                    "symbol": symbol,
                    "yf_symbol": symbol, # Keep internal consistency
                    "current_price": current,
                    "previous_close": prev_close,
                    "source": "alpha_vantage",
                }
        except Exception as e:
            logger.error(f"Alpha Vantage HTTP error: {e}")
        return None

aggregator = DataAggregator()
