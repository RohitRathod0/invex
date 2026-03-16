from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from services.market_service import get_indices, get_stock_price, get_stock_history
from datetime import datetime
import yfinance as yf

router = APIRouter(prefix="/market", tags=["market"])

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
async def get_market_tickers():
    """Restored legacy tickers route for dashboard compatibility"""
    results = []
    for key, meta in TICKERS.items():
        try:
            ticker = yf.Ticker(meta["symbol"])
            hist = ticker.history(period="2d", interval="1d")
            if len(hist) >= 2:
                prev_close = float(hist["Close"].iloc[-2])
                current    = float(hist["Close"].iloc[-1])
            elif len(hist) == 1:
                prev_close = float(ticker.info.get("previousClose", hist["Close"].iloc[-1]))
                current    = float(hist["Close"].iloc[-1])
            else:
                info = ticker.info
                current    = float(info.get("regularMarketPrice") or info.get("currentPrice") or 0)
                prev_close = float(info.get("previousClose") or current)

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
        except Exception as e:
            results.append({
                "key": key, "label": meta["label"], "value": "N/A", "raw": 0, "change": "—", "up": True, "error": str(e)
            })
    return {"tickers": results}

@router.get("/indices")
async def get_market_indices():
    """Returns NIFTY, SENSEX, BANKNIFTY etc."""
    data = await get_indices()
    return {"indices": data}

@router.get("/price")
async def get_market_price(symbols: str = Query(..., description="Comma separated symbols")):
    """Returns current price for a list of symbols"""
    symbol_list = [s.strip() for s in symbols.split(",") if s.strip()]
    data = await get_stock_price(symbol_list)
    return {"prices": data}

@router.get("/history")
async def get_market_history(symbol: str, period: str = "1M"):
    """Returns historical price data for charts"""
    data = await get_stock_history(symbol, period)
    return {"history": data}
