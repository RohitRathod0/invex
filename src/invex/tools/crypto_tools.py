from crewai.tools import BaseTool
from typing import Type
from pydantic import BaseModel, Field
import requests

# Empty input schema
class EmptyInput(BaseModel):
    """Empty input schema for tools that take no arguments"""
    pass

class CryptoPriceInput(BaseModel):
    """Input schema for CryptoPriceTool"""
    crypto_id: str = Field(..., description="Cryptocurrency ID (e.g., 'bitcoin', 'ethereum')")

class CryptoPriceTool(BaseTool):
    name: str = "Get Crypto Price"
    description: str = "Fetches cryptocurrency price in INR"
    args_schema: Type[BaseModel] = CryptoPriceInput  # ALREADY CORRECT

    def _run(self, crypto_id: str) -> str:
        try:
            url = f"https://api.coingecko.com/api/v3/simple/price?ids={crypto_id}&vs_currencies=inr&include_24hr_change=true"
            response = requests.get(url)
            data = response.json()
            
            if crypto_id in data:
                price = data[crypto_id]['inr']
                change_24h = data[crypto_id].get('inr_24h_change', 0)
                return f"{crypto_id.capitalize()}: ₹{price:,.2f} INR (24h change: {change_24h:.2f}%)"
            else:
                return f"Cryptocurrency {crypto_id} not found"
        except Exception as e:
            return f"Error fetching crypto price: {str(e)}"

class TopCryptosTool(BaseTool):
    name: str = "Get Top Cryptocurrencies"
    description: str = "Gets top cryptocurrencies by market cap with INR prices"
    args_schema: Type[BaseModel] = EmptyInput  # ADD TYPE ANNOTATION

    def _run(self) -> str:
        try:
            url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=inr&order=market_cap_desc&per_page=5&page=1"
            response = requests.get(url)
            data = response.json()
            
            output = "Top Cryptocurrencies (INR):\n\n"
            for coin in data:
                output += f"- {coin['name']} ({coin['symbol'].upper()}): ₹{coin['current_price']:,.2f}"
                output += f" | 24h: {coin['price_change_percentage_24h']:.2f}%"
                output += f" | Market Cap: ₹{coin['market_cap']/10000000:.2f} Cr\n"
            
            return output
        except Exception as e:
            return f"Error fetching top cryptos: {str(e)}"
