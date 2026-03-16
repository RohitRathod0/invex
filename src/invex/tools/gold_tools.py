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
    description: str = "Fetches current gold price in INR"
    args_schema: Type[BaseModel] = EmptyInput  # ADD TYPE ANNOTATION

    def _run(self) -> str:
        try:
            gold = yf.Ticker("GOLDIAM.NS")
            info = gold.info
            price = info.get('currentPrice', 0)
            gold_per_gram = price / 10
            
            return f"""
Current Gold Price:
- Gold ETF (GOLDIAM.NS): ₹{price} per unit
- Approx. Gold Price: ₹{gold_per_gram:.2f} per gram
- 24K Gold (approx): ₹{gold_per_gram * 1.08:.2f} per gram

Sovereign Gold Bonds:
- Current SGB Series available with 2.5% p.a. interest
- 8-year maturity with exit option after 5 years
- Capital gains tax exempt if held till maturity
"""
        except Exception as e:
            return f"Error fetching gold price: {str(e)}"
