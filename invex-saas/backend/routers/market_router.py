from fastapi import APIRouter
from fastapi.responses import JSONResponse
import yfinance as yf
from datetime import datetime

router = APIRouter(prefix="/market", tags=["market"])

# Ticker symbols
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
    """
    Fetch live market data for Nifty 50, Sensex, Gold, BTC using yfinance.
    Returns current price and percentage change from previous close.
    """
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
                # Fallback intraday
                info = ticker.info
                current    = float(info.get("regularMarketPrice") or info.get("currentPrice") or 0)
                prev_close = float(info.get("previousClose") or current)

            if prev_close and prev_close != 0:
                chg_pct = ((current - prev_close) / prev_close) * 100
            else:
                chg_pct = 0.0

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
                "key":    key,
                "label":  meta["label"],
                "value":  "N/A",
                "raw":    0,
                "change": "—",
                "up":     True,
                "error":  str(e),
            })

    return {"tickers": results}
