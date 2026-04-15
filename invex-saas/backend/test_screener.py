import asyncio
from services.screener_service import screener_service
import logging

logging.basicConfig(level=logging.DEBUG)

async def main():
    await screener_service.refresh_market_data()
    print("Items loaded:", len(screener_service.cached_results))
    if len(screener_service.cached_results) > 0:
        print(screener_service.cached_results[0])
    else:
        print("Empty! Yfinance probably failed.")

asyncio.run(main())
