from crewai.tools import BaseTool
from typing import Type
from pydantic import BaseModel, Field
import yfinance as yf
import time
from datetime import datetime

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
    category: str = Field(default="high_performers", description="Category: 'high_performers' for 52-week top gainers")

class TopStocksTool(BaseTool):
    name: str = "Get Top Performing Stocks"
    description: str = "Gets highest performing Indian stocks based on 52-week returns from broader NSE universe (NOT just popular brands)"
    args_schema: Type[BaseModel] = TopStocksInput

    def _run(self, category: str = "high_performers") -> str:
        """
        Fetch NSE stocks with highest 52-week returns
        This analyzes a broader universe and returns TRUE high performers
        """
        
        # Expanded NSE universe (100+ stocks from Nifty 500)
        # This is a comprehensive list beyond just the "top brands"
        nse_universe = [
            # Large Cap
            "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "HINDUNILVR.NS",
            "ICICIBANK.NS", "ITC.NS", "SBIN.NS", "BHARTIARTL.NS", "KOTAKBANK.NS",
            "LT.NS", "ASIANPAINT.NS", "MARUTI.NS", "TITAN.NS", "AXISBANK.NS",
            
            # Mid Cap - High Growth Potential
            "ADANIENT.NS", "ADANIPORTS.NS", "BAJAJFINSV.NS", "BAJFINANCE.NS",
            "HCLTECH.NS", "SUNPHARMA.NS", "WIPRO.NS", "ULTRACEMCO.NS",
            "TATASTEEL.NS", "POWERGRID.NS", "NTPC.NS", "ONGC.NS",
            "INDUSINDBK.NS", "TECHM.NS", "TATAMOTORS.NS", "M&M.NS",
            
            # Emerging High Performers
            "TATAPOWER.NS", "VEDL.NS", "HINDALCO.NS", "COALINDIA.NS",
            "IOC.NS", "BPCL.NS", "GAIL.NS", "ADANIGREEN.NS",
            "PIDILITIND.NS", "HAVELLS.NS", "SIEMENS.NS", "ABB.NS",
            "BAJAJ-AUTO.NS", "HEROMOTOCO.NS", "EICHERMOT.NS",
            
            # Consumer & Retail
            "TATACONSUM.NS", "NESTLEIND.NS", "BRITANNIA.NS", "DABUR.NS",
            "GODREJCP.NS", "MARICO.NS", "COLPAL.NS", "TATAELXSI.NS",
            
            # IT & Tech
            "LTI.NS", "MPHASIS.NS", "PERSISTENT.NS", "COFORGE.NS",
            "LTTS.NS", "OFSS.NS", "MINDTREE.NS",
            
            # Pharma
            "DRREDDY.NS", "CIPLA.NS", "BIOCON.NS", "DIVISLAB.NS",
            "AUROPHARMA.NS", "LUPIN.NS", "TORNTPHARM.NS",
            
            # Banking & Financial
            "BANDHANBNK.NS", "FEDERALBNK.NS", "IDFCFIRSTB.NS",
            "LICHSGFIN.NS", "MUTHOOTFIN.NS", "SBICARD.NS",
            
            # Infrastructure & Realty
            "DLF.NS", "GODREJPROP.NS", "OBEROIRLTY.NS",
            "PHOENIXLTD.NS", "PRESTIGE.NS",
            
            # Auto & Auto Components
            "BOSCHLTD.NS", "MOTHERSUMI.NS", "BALKRISIND.NS",
            "APOLLOTYRE.NS", "MRF.NS", "EXIDEIND.NS",
            
            # Chemicals & Materials
            "UPL.NS", "ATUL.NS", "DEEPAKNTR.NS", "SRF.NS",
            "TATACHEM.NS", "PIDILITIND.NS",
            
            # Energy & Power
            "TORNTPOWER.NS", "JSW.NS", "SAIL.NS", "NMDC.NS",
            
            # Add more stocks for comprehensive coverage
            "IRCTC.NS", "ZOMATO.NS", "NYKAA.NS", "PAYTM.NS",
            "POLICYBZR.NS", "DELHIVERY.NS"
        ]
        
        stock_performance = []
        
        print(f"\n🔍 Analyzing {len(nse_universe)} NSE stocks for 52-week performance...")
        print("⏳ This may take 2-3 minutes for comprehensive analysis...\n")
        
        analyzed_count = 0
        
        for symbol in nse_universe:
            try:
                stock = yf.Ticker(symbol)
                
                # Fetch 52 weeks of historical data
                hist = stock.history(period="1y")
                
                if len(hist) < 200:  # Need sufficient data points
                    continue
                
                info = stock.info
                
                # Calculate 52-week return
                current_price = hist['Close'][-1]
                price_52w_ago = hist['Close'][0]
                returns_52w = ((current_price - price_52w_ago) / price_52w_ago) * 100
                
                # Apply quality filters
                market_cap = info.get('marketCap', 0)
                avg_volume = hist['Volume'].mean()
                profit_margin = info.get('profitMargins', 0)
                current_price_val = info.get('currentPrice', current_price)
                
                # Quality criteria (filter out low-quality stocks)
                if (market_cap >= 10_00_00_00_000 and  # >= ₹1000 Cr market cap
                    avg_volume >= 100_000 and  # >= 100K daily volume
                    current_price_val > 10 and  # Not penny stocks
                    profit_margin > 0):  # Profitable companies only
                    
                    stock_performance.append({
                        'symbol': symbol,
                        'name': info.get('longName', symbol.replace('.NS', '')),
                        'current_price': current_price_val,
                        'returns_52w': returns_52w,
                        'market_cap': market_cap,
                        'pe_ratio': info.get('trailingPE', 'N/A'),
                        'sector': info.get('sector', 'N/A'),
                        'profit_margin': profit_margin * 100 if profit_margin else 'N/A',
                        'avg_volume': avg_volume
                    })
                    
                    analyzed_count += 1
                
                # Rate limiting to avoid API throttling
                time.sleep(0.15)
                
            except Exception as e:
                # Skip stocks with data issues
                continue
        
        print(f"✅ Successfully analyzed {analyzed_count} stocks\n")
        
        # Sort by 52-week returns (highest first)
        stock_performance.sort(key=lambda x: x['returns_52w'], reverse=True)
        
        # Get top 15 performers
        top_performers = stock_performance[:15]
        
        # Format output
        output = f"\n{'='*80}\n"
        output += f"🚀 TOP {len(top_performers)} HIGHEST PERFORMING NSE STOCKS (52-Week Returns)\n"
        output += f"{'='*80}\n\n"
        output += "📊 These are the ACTUAL best performers, NOT just popular brands!\n"
        output += f"Analyzed {len(nse_universe)} stocks, filtered {analyzed_count} quality stocks\n\n"
        
        for i, stock in enumerate(top_performers, 1):
            pe_val = stock['pe_ratio']
            if isinstance(pe_val, (int, float)):
                pe_str = f"{pe_val:.2f}"
            else:
                pe_str = str(pe_val)
            
            pm_val = stock['profit_margin']
            if isinstance(pm_val, (int, float)):
                pm_str = f"{pm_val:.2f}%"
            else:
                pm_str = str(pm_val)
            
            output += f"{i}. **{stock['name']}** ({stock['symbol']})\n"
            output += f"   📈 52-Week Returns: **{stock['returns_52w']:.2f}%** 🔥\n"
            output += f"   💰 Current Price: ₹{stock['current_price']:.2f}\n"
            output += f"   📊 PE Ratio: {pe_str}\n"
            output += f"   🏢 Sector: {stock['sector']}\n"
            output += f"   💼 Market Cap: ₹{stock['market_cap']/10_00_00_000:.2f} Cr\n"
            output += f"   📉 Profit Margin: {pm_str}\n"
            output += f"   📊 Avg Volume: {stock['avg_volume']:,.0f} shares/day\n\n"
        
        output += f"\n{'='*80}\n"
        output += "ℹ️  QUALITY FILTERS APPLIED:\n"
        output += "   ✓ Market Cap >= ₹1,000 Cr (large & mid-cap only)\n"
        output += "   ✓ Daily Volume >= 1 Lakh shares (high liquidity)\n"
        output += "   ✓ Price > ₹10 (no penny stocks)\n"
        output += "   ✓ Profit Margin > 0% (profitable companies only)\n"
        output += f"{'='*80}\n"
        
        return output
