import pandas as pd
import numpy as np
from backtesting import Backtest, Strategy
from datetime import date
from typing import Dict, Any

class AIRecommendationStrategy(Strategy):
    """Backtest AI recommendations against historical data"""
    
    def init(self):
        # Load AI signals from historical runs
        # These are pre-computed signals in the dataframe as 'AI_Signal' (e.g. BUY, SELL, HOLD)
        self.signals = self.data.AI_Signal
        
    def next(self):
        if self.signals[-1] == 'BUY':
            if not self.position:
                self.buy()
        elif self.signals[-1] == 'SELL':
            if self.position:
                self.position.close()

def run_backtest(strategy_df: pd.DataFrame, initial_cash: float = 100000.0) -> Dict[str, Any]:
    """
    Args:
        strategy_df: DataFrame with columns [Date, Open, High, Low, Close, Volume, AI_Signal]
                     Date must be set as datetime index.
        initial_cash: Starting cash for the backtest
    Returns:
        Dictionary with backtest metrics and equity curve data
    """
    if strategy_df.empty:
        return {"error": "Insufficient data for backtesting"}
        
    try:
        # Run Backtest
        bt = Backtest(strategy_df, AIRecommendationStrategy, cash=initial_cash, trade_on_close=True)
        results = bt.run()
        
        # Extract equity curve
        equity_curve_data = bt._results._equity_curve
        equity_records = []
        if equity_curve_data is not None and not equity_curve_data.empty:
            for idx, row in equity_curve_data.iterrows():
                equity_records.append({
                    "date": idx.strftime("%Y-%m-%d"),
                    "equity": float(row["Equity"]),
                    "drawdown": float(row["DrawdownPct"]) * 100  # convert to %
                })
        
        # Extract trade history
        trades_df = results._trades
        trades_history = []
        if trades_df is not None and not trades_df.empty:
            for idx, row in trades_df.iterrows():
                trades_history.append({
                    "size": int(row["Size"]),
                    "entry_price": float(row["EntryPrice"]),
                    "exit_price": float(row["ExitPrice"]),
                    "entry_time": row["EntryTime"].strftime("%Y-%m-%d") if pd.notnull(row["EntryTime"]) else None,
                    "exit_time": row["ExitTime"].strftime("%Y-%m-%d") if pd.notnull(row["ExitTime"]) else None,
                    "return_pct": float(row["ReturnPct"]) * 100,
                    "pnl": float(row["PnL"])
                })
                
        return {
            'total_return': float(results.get('Return [%]', 0)),
            'cagr': float(results.get('Buy & Hold Return [%]', 0)) if pd.notna(results.get('Buy & Hold Return [%]')) else 0.0,
            'sharpe_ratio': float(results.get('Sharpe Ratio', 0)) if pd.notna(results.get('Sharpe Ratio')) else 0.0,
            'max_drawdown': float(results.get('Max. Drawdown [%]', 0)),
            'win_rate': float(results.get('Win Rate [%]', 0)),
            'avg_trade_duration': str(results.get('Avg. Trade Duration', 'N/A')),
            'total_trades': int(results.get('# Trades', 0)),
            'equity_curve': equity_records,
            'trades_history': trades_history
        }
    except Exception as e:
        import traceback
        return {"error": str(e), "trace": traceback.format_exc()}
