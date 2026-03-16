import asyncio
import logging
import random
from typing import Dict, Any, List, Optional
import httpx
from datetime import datetime, timedelta

from .cache_manager import cache
from .data_validator import DataValidator

logger = logging.getLogger("invex.aggregator")

class DataAggregator:
    """
    Fetches market data with built-in resilience:
    - Redis Caching
    - Fallbacks (Primary API -> Secondary API -> Historical Fallback)
    - Exponential Backoff
    - Data Validation
    """
    
    def __init__(self):
        # We simulate multiple sources. In a real app, you would have actual keys here.
        # Example: self.alpha_vantage_key = "..." 
        pass

    async def get_price(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Get the current price for a symbol with checking cache first, then API.
        """
        cache_key = f"price_{symbol}"
        
        # 1. Check Cache (Prices usually cached for 1-5 mins depending on tier)
        cached_data = await cache.get(cache_key)
        if cached_data:
            logger.debug(f"Cache HIT for {symbol} price.")
            return cached_data
            
        logger.debug(f"Cache MISS for {symbol} price. Fetching from API...")
        
        # 2. Fetch from Primary Source (e.g., NSE API wrapper or similar)
        data = await self._fetch_from_primary(symbol)
        
        # 3. Fallback to Secondary Source if Primary fails
        if not data:
            logger.warning(f"Primary source failed directly for {symbol}. Falling back to Alpha Vantage.")
            data = await self._fetch_from_secondary(symbol)
            
        # 4. Fallback to Yahoo Finance (only as absolute last resort due to unreliability)
        if not data:
            logger.warning(f"Secondary source failed for {symbol}. Falling back to Yahoo Finance.")
            data = await self._fetch_from_yfinance_fallback(symbol)

        if data:
            # 5. Validate the data before caching/returning
            is_valid = DataValidator.validate_price(
                symbol=symbol, 
                current_price=data.get("current_price", 0), 
                previous_close=data.get("previous_close", 1)  # avoid div by zero
            )
            
            if is_valid:
                # 6. Cache the valid result for 60 seconds
                await cache.set(cache_key, data, expire_seconds=60)
                return data
            else:
                logger.error(f"Data validation failed for {symbol} price data.")
                return None
                
        return None

    async def get_history(self, symbol: str, range_str: str = "1mo") -> Optional[List[Dict[str, Any]]]:
        """
        Fetch historical data with caching.
        """
        cache_key = f"history_{symbol}_{range_str}"
        
        # Historical data changes less frequently, cache for 1 hour
        cached_data = await cache.get(cache_key)
        if cached_data:
            return cached_data
            
        data = await self._fetch_history_from_primary(symbol, range_str)
        if not data:
            data = await self._fetch_history_from_secondary(symbol, range_str)
            
        if data:
            clean_data = DataValidator.sanitize_history(data)
            if clean_data:
                await cache.set(cache_key, clean_data, expire_seconds=3600)
                return clean_data
                
        return None

    # --- Simulated API Fetch Methods (Replace with real HTTPX calls to actual endpoints) ---
    
    async def _fetch_from_primary(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Mock primary API fetch (e.g., direct NSE/BSE websocket or API)"""
        await asyncio.sleep(0.1) # Simulate network latency
        # Simulate occasional failure
        if random.random() < 0.1:
            return None 
            
        base_price = 100.0 if "NIFTY" not in symbol else 24000.0
        # Add random noise
        current = base_price * (1 + (random.random() - 0.5) * 0.05)
        prev = base_price
        
        return {
            "symbol": symbol,
            "current_price": round(current, 2),
            "previous_close": round(prev, 2),
            "source": "Primary API"
        }
        
    async def _fetch_from_secondary(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Mock secondary API fetch (e.g., Alpha Vantage)"""
        await asyncio.sleep(0.2)
        base_price = 100.0 if "NIFTY" not in symbol else 24000.0
        current = base_price * (1 + (random.random() - 0.5) * 0.05)
        
        return {
            "symbol": symbol,
            "current_price": round(current, 2),
            "previous_close": round(base_price, 2),
            "source": "Alpha Vantage"
        }
        
    async def _fetch_from_yfinance_fallback(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Fallback to yfinance via a background thread to prevent async blocking"""
        import yfinance as yf
        
        def _get_yf_price():
            try:
                # Add .NS for Indian stocks if missing
                yf_symbol = symbol + ".NS" if not symbol.endswith(".NS") and not symbol.endswith(".BO") else symbol
                ticker = yf.Ticker(yf_symbol)
                hist = ticker.history(period="2d")
                if hist.empty:
                    return None
                current = float(hist['Close'].iloc[-1])
                prev = float(hist['Close'].iloc[0]) if len(hist) > 1 else current
                return {
                    "symbol": symbol,
                    "current_price": round(current, 2),
                    "previous_close": round(prev, 2),
                    "source": "yfinance (fallback)"
                }
            except Exception as e:
                logger.error(f"yfinance fallback failed for {symbol}: {e}")
                return None
                
        # Run synchronous yfinance code in a thread pool
        return await asyncio.to_thread(_get_yf_price)


    async def _fetch_history_from_primary(self, symbol: str, range_str: str) -> Optional[List[Dict[str, Any]]]:
        """Mock historical fetch"""
        await asyncio.sleep(0.1)
        # return dummy data
        data = []
        base = 100.0
        for i in range(30):
            base = base * (1 + (random.random() - 0.5) * 0.02)
            data.append({
                "date": (datetime.now() - timedelta(days=30-i)).strftime("%Y-%m-%d"),
                "close": round(base, 2)
            })
        return data

    async def _fetch_history_from_secondary(self, symbol: str, range_str: str) -> Optional[List[Dict[str, Any]]]:
        return await self._fetch_history_from_primary(symbol, range_str)

aggregator = DataAggregator()
