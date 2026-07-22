"""
Quick diagnostic: test analyze-news and screener imports
"""
import asyncio
import sys
import os
sys.path.insert(0, r"C:\Users\rohit\OneDrive\Desktop\invex\backend")

async def test_screener():
    print("=== Testing Screener Service ===")
    try:
        from services.screener_service import ScreenerService
        svc = ScreenerService()
        print("[OK] ScreenerService instantiated")
        # Only fetch one symbol to test
        import yfinance as yf
        t = yf.Ticker("RELIANCE.NS")
        fi = t.fast_info
        print(f"[OK] yfinance fast_info: last_price={getattr(fi, 'last_price', None)}")
    except Exception as e:
        print(f"[FAIL] Screener: {e}")

async def test_portfolio_analyst():
    print("\n=== Testing Portfolio Analyst Agent imports ===")
    try:
        from utils.resilient_llm import get_langchain_llm
        llm = get_langchain_llm("analysis_group")
        print(f"[OK] analysis_group LLM: {type(llm).__name__}")
    except Exception as e:
        print(f"[FAIL] LLM init: {e}")

    try:
        from utils.context_compressor import get_user_context
        ctx = get_user_context("nonexistent")
        print(f"[OK] context_compressor: '{ctx}'")
    except Exception as e:
        print(f"[FAIL] context_compressor: {e}")

    try:
        from utils.rate_limiter import analysis_limiter
        print(f"[OK] rate_limiter imported")
    except Exception as e:
        print(f"[FAIL] rate_limiter: {e}")

    try:
        from services.news_service import MarketNewsTool
        tool = MarketNewsTool()
        print(f"[OK] MarketNewsTool instantiated")
    except Exception as e:
        print(f"[FAIL] MarketNewsTool: {e}")

    try:
        from services.portfolio_analyst_agent import portfolio_analyst
        print(f"[OK] portfolio_analyst singleton loaded")
    except Exception as e:
        import traceback
        print(f"[FAIL] portfolio_analyst_agent: {e}")
        traceback.print_exc()


async def main():
    await test_screener()
    await test_portfolio_analyst()

asyncio.run(main())
