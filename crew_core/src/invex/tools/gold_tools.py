from crewai.tools import BaseTool
from typing import Type
from pydantic import BaseModel
import yfinance as yf

# Empty input schema
class EmptyInput(BaseModel):
    """Empty input schema for tools that take no arguments"""
    pass

class GoldPriceTool(BaseTool):
    name: str = "Get Gold Price"
    description: str = "Fetches current gold price in INR using the GOLDBEES ETF (Nippon India Gold ETF) as a reliable proxy"
    args_schema: Type[BaseModel] = EmptyInput

    def _run(self) -> str:
        try:
            # GOLDBEES.NS = Nippon India ETF Gold BeES (1 unit ≈ ~0.01g gold)
            # Use GOLDETF.NS as backup
            gold = yf.Ticker("GOLDBEES.NS")
            info = gold.info
            price = info.get('currentPrice', 0) or info.get('regularMarketPrice', 0)

            # GOLDBEES: 1 unit ≈ 1/100th of a gram of gold (approximate)
            # So approx gold per gram = price * 100
            approx_per_gram = price * 100 if price else 0

            return f"""
Current Gold Price (via GOLDBEES ETF — Nippon India Gold ETF):
- GOLDBEES.NS ETF Price: ₹{price:.2f} per unit
- Approx. 24K Gold Price: ₹{approx_per_gram:,.0f} per gram (estimated)
- 10g Gold (approx): ₹{approx_per_gram * 10:,.0f}

Sovereign Gold Bonds (SGB):
- Interest: 2.5% p.a. on issue price
- 8-year maturity with exit option after 5 years
- Capital gains tax exempt if held till maturity
"""
        except Exception as e:
            return f"Error fetching gold price: {str(e)}"

