import pandas as pd
from typing import List, Dict, Any
from datetime import datetime, timedelta
import random

class InsiderTradingDetector:
    """
    Detects patterns in insider trading data (e.g. promoters buying/selling).
    """
    
    async def fetch_insider_trades(self, symbol: str, days_back: int = 90) -> Dict[str, Any]:
        """
        Mock fetching from NSE bulk deals / SAST disclosures.
        In a real scenario, this would hit NSE API or a data provider.
        """
        # Generate some mock trades for demonstration
        trades = self._generate_mock_trades(symbol, days_back)
        return self.analyze_insider_pattern(trades)
    
    def analyze_insider_pattern(self, insider_trades: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Detect significant patterns in insider activity"""
        
        # Categorize by person type
        promoter_trades = [t for t in insider_trades if t['person_category'] == 'Promoter']
        director_trades = [t for t in insider_trades if t['person_category'] in ['Director', 'KMP']]
        
        # Pattern detection
        patterns = self._detect_patterns(insider_trades)
        
        analysis = {
            'overall_signal': 'NEUTRAL',
            'confidence': 50,
            'reason': 'Normal insider activity',
            'patterns': patterns,
            'recent_trades': insider_trades[:10] # Return top 10 most recent
        }
        
        # Generate signal based on patterns
        if patterns['aggressive_buying'] and len(patterns['buyers']) >= 2:
            analysis['overall_signal'] = 'BULLISH'
            analysis['confidence'] = 85
            analysis['reason'] = f"{len(patterns['buyers'])} insiders buying aggressively"
        elif patterns['promoter_accumulation']:
            analysis['overall_signal'] = 'BULLISH'
            analysis['confidence'] = 70
            analysis['reason'] = "Consistent promoter accumulation detected"
        elif patterns['promoter_selling'] > (patterns['promoter_buying'] * 2) and patterns['promoter_selling'] > 0:
            analysis['overall_signal'] = 'BEARISH'
            analysis['confidence'] = 75
            analysis['reason'] = "Promoters selling heavily compared to buying"
            
        return analysis

    def _detect_patterns(self, trades: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Detect specific patterns from trade list"""
        patterns = {
            'aggressive_buying': False,
            'promoter_accumulation': False,
            'buyers': [],
            'promoter_buying': 0,
            'promoter_selling': 0
        }
        
        now = datetime.now()
        
        # Check for clustered buying (multiple insiders buying within 30 days)
        recent_buys = [t for t in trades 
                       if t['trade_type'] == 'BUY' 
                       and (now - datetime.fromisoformat(t['date'])).days <= 30]
        
        if len(recent_buys) >= 2:
            patterns['aggressive_buying'] = True
            patterns['buyers'] = list(set(t['person_name'] for t in recent_buys))
            
        # Promoter accumulation
        promoter_trades = [t for t in trades if t['person_category'] == 'Promoter']
        patterns['promoter_buying'] = sum((float(t['value']) for t in promoter_trades if t['trade_type'] == 'BUY'), 0.0)
        patterns['promoter_selling'] = sum((float(t['value']) for t in promoter_trades if t['trade_type'] == 'SELL'), 0.0)
        
        if patterns['promoter_buying'] > 0 and patterns['promoter_buying'] > (patterns['promoter_selling'] * 1.5):
            patterns['promoter_accumulation'] = True
            
        return patterns

    def _generate_mock_trades(self, symbol: str, days_back: int) -> List[Dict[str, Any]]:
        names = ["Mukesh Ambani", "Isha Ambani", "Akash Ambani", "Natarajan Chandrasekaran", "Salil Parekh"]
        categories = ["Promoter", "Director", "KMP"]
        types = ["BUY", "SELL"]
        
        trades = []
        now = datetime.now()
        
        # Randomly decide if this stock has a cluster of buying or selling to make demo interesting
        trend = random.choice(["BUY_HEAVY", "SELL_HEAVY", "NEUTRAL"])
        
        num_trades = random.randint(3, 15)
        for i in range(num_trades):
            days_ago = random.randint(1, days_back)
            trade_date = (now - timedelta(days=days_ago)).isoformat()
            
            # Skew trades based on trend
            if trend == "BUY_HEAVY":
                t_type = "BUY" if random.random() > 0.2 else "SELL"
            elif trend == "SELL_HEAVY":
                t_type = "SELL" if random.random() > 0.2 else "BUY"
            else:
                t_type = random.choice(types)
                
            qty = random.randint(1000, 50000)
            price = random.uniform(100.0, 3000.0)
            
            trades.append({
                'id': f"TRD{random.randint(10000,99999)}",
                'date': trade_date,
                'person_name': random.choice(names),
                'person_category': random.choice(categories),
                'trade_type': t_type,
                'quantity': qty,
                'price': round(price, 2),
                'value': round(qty * price, 2)
            })
            
        # Sort by date descending
        trades.sort(key=lambda x: x['date'], reverse=True)
        return trades
