import asyncio
from services.data_aggregator import aggregator

async def test():
    symbols = ['AAPL', 'TCS', 'RELIANCE', 'INFY', 'TSLA']
    for sym in symbols:
        r = await aggregator.get_price(sym)
        if r:
            chg = ((r['current_price'] - r['previous_close']) / r['previous_close']) * 100
            print(sym, '|', r['yf_symbol'], '| price:', r['current_price'], '| chg:', round(chg, 2))
        else:
            print(sym, '| FAILED')

asyncio.run(test())
