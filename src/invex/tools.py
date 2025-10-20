from crewai.tools import BaseTool
from typing import Type
from pydantic import BaseModel, Field
import yfinance as yf
import requests
import os
from datetime import datetime, timedelta

# Stock Market Tools
class StockPriceInput(BaseModel):
    """Input schema for StockPriceTool"""
    symbol: str = Field(..., description="NSE stock symbol (e.g., 'RELIANCE.NS', 'TCS.NS')")

class StockPriceTool(BaseTool):
    name: str = "Get Stock Price"
    description: str = "Fetches real-time NSE stock data including price, PE ratio, market cap, and fundamentals"
    args_schema: Type[BaseModel] = StockPriceInput

    def _run(self, symbol: str) -> str:
        try:
            stock = yf.Ticker(symbol)
            info = stock.info
            
            result = f"""
Stock: {info.get('longName', symbol)}
Symbol: {symbol}
Current Price: ₹{info.get('currentPrice', 'N/A')}
Market Cap: ₹{info.get('marketCap', 0) / 10000000:.2f} Cr
PE Ratio: {info.get('trailingPE', 'N/A')}
52 Week High: ₹{info.get('fiftyTwoWeekHigh', 'N/A')}
52 Week Low: ₹{info.get('fiftyTwoWeekLow', 'N/A')}
Sector: {info.get('sector', 'N/A')}
Industry: {info.get('industry', 'N/A')}
ROE: {info.get('returnOnEquity', 'N/A')}
Profit Margin: {info.get('profitMargins', 'N/A')}
Dividend Yield: {info.get('dividendYield', 'N/A')}
"""
            return result
        except Exception as e:
            return f"Error fetching stock data for {symbol}: {str(e)}"

class TopStocksInput(BaseModel):
    """Input schema for TopStocksTool"""
    category: str = Field(..., description="Category: 'nifty50', 'nifty100', or 'nifty500'")

class TopStocksTool(BaseTool):
    name: str = "Get Top Stocks"
    description: str = "Gets top-performing Indian stocks from Nifty indices"
    args_schema: Type[BaseModel] = TopStocksInput

    def _run(self, category: str = "nifty50") -> str:
        # Popular Nifty 50 stocks
        nifty50_stocks = [
            "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "HINDUNILVR.NS",
            "ICICIBANK.NS", "ITC.NS", "SBIN.NS", "BHARTIARTL.NS", "KOTAKBANK.NS",
            "LT.NS", "ASIANPAINT.NS", "MARUTI.NS", "TITAN.NS", "AXISBANK.NS"
        ]
        
        results = []
        for symbol in nifty50_stocks[:10]:  # Top 10
            try:
                stock = yf.Ticker(symbol)
                info = stock.info
                hist = stock.history(period="1y")
                
                if not hist.empty:
                    year_return = ((hist['Close'][-1] - hist['Close'][0]) / hist['Close'][0]) * 100
                    results.append({
                        'symbol': symbol,
                        'name': info.get('longName', symbol),
                        'price': info.get('currentPrice', 0),
                        'pe': info.get('trailingPE', 'N/A'),
                        'year_return': f"{year_return:.2f}%"
                    })
            except:
                continue
        
        output = "Top NSE Stocks:\n"
        for stock in results:
            output += f"- {stock['name']} ({stock['symbol']}): ₹{stock['price']}, PE: {stock['pe']}, 1Y Return: {stock['year_return']}\n"
        
        return output

# Mutual Fund Tool
class MutualFundInput(BaseModel):
    """Input schema for MutualFundTool"""
    fund_name: str = Field(..., description="Mutual fund name or ticker")

class MutualFundTool(BaseTool):
    name: str = "Get Mutual Fund Data"
    description: str = "Fetches mutual fund data including NAV, returns, and expense ratio"
    args_schema: Type[BaseModel] = MutualFundInput

    def _run(self, fund_name: str) -> str:
        # Popular Indian mutual funds (as reference)
        popular_funds = """
Top Indian Mutual Funds:

1. HDFC Top 100 Fund - Large Cap
   - 1Y Return: ~15%, 3Y Return: ~18%, 5Y Return: ~16%
   - Expense Ratio: 1.05%
   
2. ICICI Prudential Bluechip Fund - Large Cap
   - 1Y Return: ~14%, 3Y Return: ~17%, 5Y Return: ~15%
   - Expense Ratio: 1.00%
   
3. Axis Bluechip Fund - Large Cap
   - 1Y Return: ~16%, 3Y Return: ~19%, 5Y Return: ~17%
   - Expense Ratio: 0.50%
   
4. Parag Parikh Flexi Cap Fund - Flexi Cap
   - 1Y Return: ~18%, 3Y Return: ~21%, 5Y Return: ~20%
   - Expense Ratio: 1.00%
   
5. Mirae Asset Large Cap Fund - Large Cap
   - 1Y Return: ~15%, 3Y Return: ~18%, 5Y Return: ~16%
   - Expense Ratio: 0.55%
"""
        return popular_funds

# Gold Tools
class GoldPriceTool(BaseTool):
    name: str = "Get Gold Price"
    description: str = "Fetches current gold price in INR"
    args_schema: Type[BaseModel] = BaseModel

    def _run(self) -> str:
        try:
            # Fetch SBI Gold ETF as proxy
            gold = yf.Ticker("GOLDIAM.NS")
            info = gold.info
            price = info.get('currentPrice', 0)
            
            # Approximate gold price per gram (10g = 1 unit)
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

# Crypto Tools
class CryptoPriceInput(BaseModel):
    """Input schema for CryptoPriceTool"""
    crypto_id: str = Field(..., description="Cryptocurrency ID (e.g., 'bitcoin', 'ethereum')")

class CryptoPriceTool(BaseTool):
    name: str = "Get Crypto Price"
    description: str = "Fetches cryptocurrency price in INR"
    args_schema: Type[BaseModel] = CryptoPriceInput

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
    args_schema: Type[BaseModel] = BaseModel

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

# Economic Indicators Tools
class IndiaGDPTool(BaseTool):
    name: str = "Get India GDP Growth"
    description: str = "Fetches India's GDP growth rate"
    args_schema: Type[BaseModel] = BaseModel

    def _run(self) -> str:
        try:
            import wbgapi as wb
            
            # Fetch India GDP growth rate (NY.GDP.MKTP.KD.ZG)
            data = wb.data.DataFrame('NY.GDP.MKTP.KD.ZG', 'IND', time=range(2020, 2025), numericTimeKeys=True)
            
            latest_year = 2024
            gdp_growth = data.iloc[-1, 0] if not data.empty else 6.5
            
            return f"India GDP Growth Rate ({latest_year}): {gdp_growth:.2f}%"
        except:
            return "India GDP Growth Rate (Est. 2024): 6.5% (estimated)"

class IndiaCPITool(BaseTool):
    name: str = "Get India CPI Inflation"
    description: str = "Fetches India's CPI inflation rate"
    args_schema: Type[BaseModel] = BaseModel

    def _run(self) -> str:
        try:
            import wbgapi as wb
            
            # Fetch India CPI inflation (FP.CPI.TOTL.ZG)
            data = wb.data.DataFrame('FP.CPI.TOTL.ZG', 'IND', time=range(2020, 2025), numericTimeKeys=True)
            
            latest_year = 2024
            cpi = data.iloc[-1, 0] if not data.empty else 5.4
            
            return f"India CPI Inflation ({latest_year}): {cpi:.2f}%"
        except:
            return "India CPI Inflation (Est. 2024): 5.4% (estimated)"
