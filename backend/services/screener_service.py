import asyncio
import pandas as pd
import random
import math
from datetime import datetime, timedelta
from typing import List, Dict, Any

class ScreenerService:
    def __init__(self):
        # We simulate a larger universe (approaching NIFTY 100/500 density for showcase)
        # TODO: replace with cron-populated DB
        raw_symbols = [
            ("RELIANCE.NS", "Reliance Industries", "Energy", "Large"),
            ("TCS.NS", "Tata Consultancy Services", "Technology", "Large"),
            ("HDFCBANK.NS", "HDFC Bank", "Financials", "Large"),
            ("INFY.NS", "Infosys", "Technology", "Large"),
            ("ICICIBANK.NS", "ICICI Bank", "Financials", "Large"),
            ("HINDUNILVR.NS", "Hindustan Unilever", "Consumer", "Large"),
            ("ITC.NS", "ITC Ltd", "Consumer", "Large"),
            ("SBIN.NS", "State Bank of India", "Financials", "Large"),
            ("BHARTIARTL.NS", "Bharti Airtel", "Telecom", "Large"),
            ("KOTAKBANK.NS", "Kotak Mahindra Bank", "Financials", "Large"),
            ("LT.NS", "Larsen & Toubro", "Industrials", "Large"),
            ("AXISBANK.NS", "Axis Bank", "Financials", "Large"),
            ("ASIANPAINT.NS", "Asian Paints", "Consumer", "Large"),
            ("MARUTI.NS", "Maruti Suzuki", "Automobiles", "Large"),
            ("SUNPHARMA.NS", "Sun Pharma", "Healthcare", "Large"),
            ("TATMOTORS.NS", "Tata Motors", "Automobiles", "Large"),
            ("BAJFINANCE.NS", "Bajaj Finance", "Financials", "Large"),
            ("TITAN.NS", "Titan Company", "Consumer", "Large"),
            ("WIPRO.NS", "Wipro", "Technology", "Large"),
            ("ONGC.NS", "ONGC", "Energy", "Large"),
            # Mock entries for mid/small caps
            ("IRCTC.NS", "IRCTC", "Consumer", "Mid"),
            ("TATAELXSI.NS", "Tata Elxsi", "Technology", "Mid"),
            ("DIXON.NS", "Dixon Technologies", "Technology", "Mid"),
            ("DEEPAKNTR.NS", "Deepak Nitrite", "Materials", "Mid"),
            ("POLYCAB.NS", "Polycab India", "Industrials", "Mid"),
            ("IDFCFIRSTB.NS", "IDFC First Bank", "Financials", "Mid"),
            ("ZOMATO.NS", "Zomato", "Consumer", "Large"),
            ("PAYTM.NS", "One97 Communications", "Financials", "Mid"),
            ("NYKAA.NS", "FSN E-Commerce", "Consumer", "Mid"),
            ("CDSL.NS", "CDSL", "Financials", "Mid"),
            ("BSE.NS", "BSE Ltd", "Financials", "Mid"),
            ("HAL.NS", "Hindustan Aeronautics", "Industrials", "Large"),
            ("BEL.NS", "Bharat Electronics", "Industrials", "Large"),
            ("RVNL.NS", "Rail Vikas Nigam", "Industrials", "Mid"),
            ("IREDA.NS", "IREDA", "Financials", "Mid"),
            ("JIOFIN.NS", "Jio Financial", "Financials", "Large"),
            ("CHEMPLASTS.NS", "Chemplast Sanmar", "Materials", "Small"),
            ("KPITTECH.NS", "KPIT Tech", "Technology", "Mid"),
        ]
        
        self.universe = [{"symbol": s[0], "name": s[1], "sector": s[2], "cap_size": s[3]} for s in raw_symbols]
        self.cached_results = []
        self.last_updated_at = None
        self.refresh_ttl = timedelta(seconds=60)
        self._refresh_lock = asyncio.Lock()

    def _safe_number(self, value, default=0.0):
        try:
            number = float(value)
        except (TypeError, ValueError):
            return default
        return number if math.isfinite(number) else default
        
    async def refresh_market_data(self):
        """
        Fetches real market data using yfinance for screener evaluation.
        """
        import yfinance as yf
        import asyncio
        from services.sector_rotation import SectorRotation

        async def _fetch_stock(item):
            sym = item["symbol"]
            sector = item["sector"]
            
            def _get_yf():
                ticker = yf.Ticker(sym)
                fi = ticker.fast_info
                current = getattr(fi, "last_price", None)
                prev = getattr(fi, "previous_close", None)
                market_cap = getattr(fi, "market_cap", 0)
                
                # Fetch 6-month history for technical indicators (RSI, DMAs)
                hist = ticker.history(period="6mo", auto_adjust=True)
                
                # Use .info for fundamentals, gracefully fall back if yf fails to fetch
                try:
                    info = ticker.info
                except Exception:
                    info = {}
                    
                return current, prev, market_cap, hist, info
            
            try:
                current, prev, market_cap, hist, info = await asyncio.to_thread(_get_yf)
            except Exception:
                return None
                
            if current is None or hist.empty:
                return None
            
            current = self._safe_number(current)
            prev = self._safe_number(prev, current) if prev else current
            change_pct = ((current - prev)/prev) * 100 if prev else 0.0

            # --- Technicals ---
            closes = hist["Close"]
            if len(closes) > 30:
                rsi = self._safe_number(SectorRotation.calculate_rsi(closes), 50.0)
                dma_50 = self._safe_number(closes.rolling(50).mean().iloc[-1], current)
                dma_200 = self._safe_number(closes.rolling(200).mean().iloc[-1], current)
            else:
                rsi = 50.0
                dma_50 = current
                dma_200 = current
            
            # --- Fundamentals ---
            pe = self._safe_number(info.get("trailingPE") or info.get("forwardPE"))
            roe = self._safe_number(info.get("returnOnEquity")) * 100
            yield_pct = self._safe_number(info.get("dividendYield")) * 100
            debt_equity = self._safe_number(info.get("debtToEquity"))
            eps_growth = self._safe_number(info.get("earningsQuarterlyGrowth")) * 100
            revenue_growth = self._safe_number(info.get("revenueGrowth")) * 100
            profit_growth = eps_growth 
            fcf = self._safe_number(info.get("freeCashflow"))
            roce = roe * 1.1 # proxy if missing
            market_cap_cr = self._safe_number(market_cap) / 10000000 # Convert to Crores
            
            # --- Flags ---
            vol = hist["Volume"]
            volume_spike = len(vol) > 5 and vol.iloc[-1] > (vol.iloc[-5:-1].mean() * 2)
            high_52 = self._safe_number(info.get("fiftyTwoWeekHigh"), current)
            wk52_high_breakout = current >= (high_52 * 0.98)
            macd_crossover = False # simplified
            
            # --- Internal Scoring ---
            quality_score = min(100, max(0, (roe * 2) + (eps_growth * 1.5) - (debt_equity * 10)))
            momentum_score = 0
            if 50 < rsi < 70: momentum_score += 30
            elif rsi >= 70: momentum_score += 40
            if current > dma_50: momentum_score += 20
            if current > dma_200: momentum_score += 20
            if volume_spike: momentum_score += 15
            if wk52_high_breakout: momentum_score += 15
            momentum_score = min(100, momentum_score)
            
            return {
                "symbol": sym,
                "name": item["name"],
                "sector": sector,
                "cap_size": item["cap_size"],
                "price": round(current, 2),
                "change_pct": round(change_pct, 2),
                # Fundamentals
                "pe_ratio": round(pe, 2),
                "market_cap": round(market_cap_cr, 2),
                "dividend_yield": round(yield_pct, 2),
                "roe": round(roe, 2),
                "roce": round(roce, 2),
                "eps_growth": round(eps_growth, 2),
                "revenue_growth": round(revenue_growth, 2),
                "profit_growth": round(profit_growth, 2),
                "debt_to_equity": round(debt_equity, 2),
                "fcf": round(fcf, 2),
                # Technicals
                "rsi": round(rsi, 2),
                "dma_50": round(dma_50, 2),
                "dma_200": round(dma_200, 2),
                "volume_spike": bool(volume_spike),
                "wk52_high_breakout": bool(wk52_high_breakout),
                "macd_crossover": macd_crossover,
                # Scoring
                "quality_score": round(quality_score, 2),
                "momentum_score": round(momentum_score, 2),
                "total_score": round((quality_score*0.5)+(momentum_score*0.5), 2)
            }

        new_cache = []
        # Run dynamically, limiting concurrency if needed, but gathering all 40 symbols should be fast enough
        tasks = [_fetch_stock(item) for item in self.universe]
        results = await asyncio.gather(*tasks)
        for r in results:
            if r:
                new_cache.append(r)
                
        if new_cache:
            self.cached_results = new_cache
            self.last_updated_at = datetime.now().isoformat()

    async def ensure_market_data_fresh(self, force: bool = False):
        if not force and self.cached_results and self.last_updated_at:
            try:
                last_updated = datetime.fromisoformat(self.last_updated_at)
                if datetime.now() - last_updated < self.refresh_ttl:
                    return
            except ValueError:
                pass

        async with self._refresh_lock:
            if not force and self.cached_results and self.last_updated_at:
                try:
                    last_updated = datetime.fromisoformat(self.last_updated_at)
                    if datetime.now() - last_updated < self.refresh_ttl:
                        return
                except ValueError:
                    pass

            await self.refresh_market_data()

    def screen_assets(self, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        filtered = list(self.cached_results)
        
        # Sector 
        sec = filters.get("sector")
        if sec and sec.lower() != "all":
            filtered = [a for a in filtered if a["sector"].lower() == sec.lower()]
            
        # PE
        if filters.get("min_pe") is not None: filtered = [a for a in filtered if a["pe_ratio"] >= float(filters["min_pe"])]
        if filters.get("max_pe") is not None: filtered = [a for a in filtered if a["pe_ratio"] <= float(filters["max_pe"])]
            
        # Market Cap
        if filters.get("min_market_cap") is not None: filtered = [a for a in filtered if a["market_cap"] >= float(filters["min_market_cap"])]
        if filters.get("max_market_cap") is not None: filtered = [a for a in filtered if a["market_cap"] <= float(filters["max_market_cap"])]

        # Fundamentals
        if filters.get("min_roe") is not None: filtered = [a for a in filtered if a["roe"] >= float(filters["min_roe"])]
        if filters.get("min_roce") is not None: filtered = [a for a in filtered if a["roce"] >= float(filters["min_roce"])]
        if filters.get("max_debt_equity") is not None: filtered = [a for a in filtered if a["debt_to_equity"] <= float(filters["max_debt_equity"])]
        if filters.get("min_eps_growth") is not None: filtered = [a for a in filtered if a["eps_growth"] >= float(filters["min_eps_growth"])]

        # Technicals
        if filters.get("min_rsi") is not None: filtered = [a for a in filtered if a["rsi"] >= float(filters["min_rsi"])]
        if filters.get("max_rsi") is not None: filtered = [a for a in filtered if a["rsi"] <= float(filters["max_rsi"])]
        
        # Flags
        if filters.get("volume_spike"): filtered = [a for a in filtered if a["volume_spike"]]
        if filters.get("wk52_high_breakout"): filtered = [a for a in filtered if a["wk52_high_breakout"]]
        if filters.get("above_dma_50"): filtered = [a for a in filtered if a["price"] > a["dma_50"]]
        if filters.get("above_dma_200"): filtered = [a for a in filtered if a["price"] > a["dma_200"]]

        # Sorting
        sort_by = filters.get("sort_by", "total_score")
        sort_desc = filters.get("sort_desc", True)
        
        # Default sort fallback to market cap if sort_by field missing
        if filtered and sort_by not in filtered[0]:
            sort_by = "market_cap"
            
        filtered.sort(key=lambda x: x[sort_by], reverse=sort_desc)
        return filtered

screener_service = ScreenerService()
