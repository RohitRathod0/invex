from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from services.market_service import get_indices, get_stock_price, get_stock_history
from services.data_aggregator import aggregator
from datetime import datetime

router = APIRouter(prefix="/market", tags=["market"])
limiter = Limiter(key_func=get_remote_address)

# Ticker symbols from original implementation
TICKERS = {
    "nifty50":  {"symbol": "^NSEI",   "label": "Nifty 50",   "currency": ""},
    "sensex":   {"symbol": "^BSESN",  "label": "Sensex",     "currency": ""},
    "gold":     {"symbol": "GC=F",    "label": "Gold",       "currency": "$"},
    "btc":      {"symbol": "BTC-USD", "label": "BTC/USD",    "currency": "$"},
}

def _fmt(value: float, symbol: str) -> str:
    if symbol in ("^NSEI", "^BSESN"):
        return f"{value:,.0f}"
    if symbol == "GC=F":
        return f"${value:,.0f}/oz"
    return f"${value:,.0f}"

@router.get("/tickers")
@limiter.limit("60/minute")
async def get_market_tickers(request: Request):
    """Restored legacy tickers route for dashboard compatibility. Rate limited: 60/minute."""
    results = []
    for key, meta in TICKERS.items():
        try:
            data = await aggregator.get_price(meta["symbol"])
            if data:
                current = data.get("current_price", 0)
                prev_close = data.get("previous_close", current)
                chg_pct = ((current - prev_close) / prev_close) * 100 if prev_close else 0.0

                results.append({
                    "key":    key,
                    "label":  meta["label"],
                    "value":  _fmt(current, meta["symbol"]),
                    "raw":    current,
                    "change": f"{'+' if chg_pct >= 0 else ''}{chg_pct:.2f}%",
                    "up":     chg_pct >= 0,
                    "updated": datetime.now().isoformat(),
                })
            else:
                results.append({
                    "key": key, "label": meta["label"], "value": "N/A", "raw": 0, "change": "—", "up": True, "error": "Failed to fetch ticker"
                })
        except Exception as e:
            results.append({
                "key": key, "label": meta["label"], "value": "N/A", "raw": 0, "change": "—", "up": True, "error": str(e)
            })
    return {"tickers": results}

@router.get("/indices")
@limiter.limit("60/minute")
async def get_market_indices(request: Request):
    """Returns NIFTY, SENSEX, BANKNIFTY etc. Rate limited: 60/minute."""
    data = await get_indices()
    return {"indices": data}

@router.get("/price")
@limiter.limit("60/minute")
async def get_market_price(request: Request, symbols: str = Query(..., description="Comma separated symbols")):
    """Returns current price for a list of symbols. Rate limited: 60/minute."""
    symbol_list = [s.strip() for s in symbols.split(",") if s.strip()]
    data = await get_stock_price(symbol_list)
    return {"prices": data}

@router.get("/history")
@limiter.limit("30/minute")
async def get_market_history(request: Request, symbol: str, period: str = "1M"):
    """Returns historical price data for charts. Rate limited: 30/minute."""
    data = await get_stock_history(symbol, period)
    return {"history": data}


@router.get("/sector-rotation")
@limiter.limit("10/minute")
async def get_sector_rotation(request: Request):
    """
    Get momentum signals for major Indian Sectoral Indices
    """
    from services.data_aggregator import aggregator
    from services.sector_rotation import SectorRotation
    import pandas as pd
    
    # Standard NIFTY sector indices (simulated symbols representing them)
    sectors = {
        "NIFTY_IT": "IT Sector",
        "NIFTY_BANK": "Banking",
        "NIFTY_FINSRV": "Financial Services",
        "NIFTY_AUTO": "Automobiles",
        "NIFTY_FMCG": "Consumer Goods",
        "NIFTY_METAL": "Metals",
        "NIFTY_PHARMA": "Pharmaceuticals",
    }
    
    results = []
    
    for symbol, name in sectors.items():
        hist = await aggregator.get_history(symbol, range_str="6mo")
        if hist and len(hist) > 30:
            df = pd.DataFrame(hist)
            closes = df['close'] if 'close' in df.columns else df['Close']
            
            rsi = SectorRotation.calculate_rsi(closes)
            macd_data = SectorRotation.calculate_macd(closes)
            
            current_price = float(closes.iloc[-1])
            prev_price = float(closes.iloc[-2]) if len(closes) > 1 else current_price
            change_pct = ((current_price - prev_price) / prev_price) * 100
            
            signal = SectorRotation.generate_signal(rsi, macd_data['histogram'])
            
            results.append({
                "symbol": symbol,
                "name": name,
                "current_price": round(current_price, 2),
                "change_pct": round(change_pct, 2),
                "rsi": round(rsi, 2),
                "macd": round(macd_data['macd'], 2),
                "signal": signal,
                "momentum_score": round((rsi / 100) * 50 + (1 if macd_data['histogram'] > 0 else -1) * 50, 2)
            })
        else:
            # Fallback mock for demonstration if the simulated aggregator fails
            results.append({
                "symbol": symbol,
                "name": name,
                "current_price": 10000.0,
                "change_pct": 0.0,
                "rsi": 50.0,
                "macd": 0.0,
                "signal": "NEUTRAL",
                "momentum_score": 50.0
            })
            
    # Sort by momentum
    results.sort(key=lambda x: x['momentum_score'], reverse=True)
    
    return results

@router.get("/insider-trades/{symbol}")
@limiter.limit("10/minute")
async def get_insider_trades(request: Request, symbol: str, days_back: int = 90):
    """
    Fetch and analyze insider trading patterns for a given symbol.
    Rate limited: 10/minute.
    """
    from services.insider_tracker import InsiderTradingDetector
    detector = InsiderTradingDetector()
    results = await detector.fetch_insider_trades(symbol, days_back)
    return results

@router.get("/sentiment/{symbol}")
@limiter.limit("10/minute")
async def get_social_sentiment(request: Request, symbol: str):
    """
    Fetch and analyze social media sentiment (Twitter/Reddit) for a given symbol.
    Rate limited: 10/minute.
    """
    from services.social_sentiment import SocialSentimentAnalyzer
    analyzer = SocialSentimentAnalyzer()
    results = await analyzer.analyze_stock_sentiment(symbol)
    return results
