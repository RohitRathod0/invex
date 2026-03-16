import pandas as pd
import numpy as np
from typing import Dict, Any, List

class SectorRotation:
    
    @staticmethod
    def calculate_rsi(prices: pd.Series, periods: int = 14) -> float:
        """Calculate Relative Strength Index"""
        if len(prices) < periods + 1:
            return 50.0 # Neutral default
            
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=periods).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=periods).mean()
        
        # Avoid division by zero
        rs = gain / (loss + 1e-9)
        rsi = 100 - (100 / (1 + rs))
        return float(rsi.iloc[-1])
        
    @staticmethod
    def calculate_macd(prices: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> Dict[str, float]:
        """Calculate MACD and Signal Line"""
        if len(prices) < slow + signal:
            return {'macd': 0.0, 'signal': 0.0, 'histogram': 0.0}
            
        exp1 = prices.ewm(span=fast, adjust=False).mean()
        exp2 = prices.ewm(span=slow, adjust=False).mean()
        macd = exp1 - exp2
        sig = macd.ewm(span=signal, adjust=False).mean()
        hist = macd - sig
        
        return {
            'macd': float(macd.iloc[-1]),
            'signal': float(sig.iloc[-1]),
            'histogram': float(hist.iloc[-1])
        }

    @staticmethod
    def generate_signal(rsi: float, macd_hist: float) -> str:
        """Generate a basic OVERWEIGHT/UNDERWEIGHT signal based on momentum"""
        # Strong Buy
        if rsi > 50 and rsi < 70 and macd_hist > 0:
            return "OVERWEIGHT"
        # Strong Sell
        elif rsi < 50 and rsi > 30 and macd_hist < 0:
            return "UNDERWEIGHT"
        # Overbought
        elif rsi >= 70:
            return "TAKE_PROFITS"
        # Oversold
        elif rsi <= 30:
            return "ACCUMULATE"
            
        return "NEUTRAL"
