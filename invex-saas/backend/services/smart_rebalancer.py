from typing import Dict, Any, List
from services.tax_optimizer import TaxOptimizer

class SmartRebalancer:
    """
    Analyzes portfolio drift and suggests rebalancing trades
    based on target allocations, momentum, and tax efficiency.
    """
    
    def __init__(self, target_allocations: Dict[str, float] = None):
        # Default target asset allocation for a balanced Indian investor
        self.target_allocations = target_allocations or {
            'EQUITY:LARGE_CAP': 0.50,
            'EQUITY:MID_CAP': 0.20,
            'EQUITY:SMALL_CAP': 0.10,
            'DEBT': 0.15,
            'GOLD': 0.05
        }
        self.tax_optimizer = TaxOptimizer()

    def generate_rebalance_plan(self, current_holdings: List[Dict], current_prices: Dict[str, float]) -> Dict[str, Any]:
        """
        Calculates drift from target and suggests optimal trades.
        """
        portfolio_value = 0.0
        current_allocations_val = {k: 0.0 for k in self.target_allocations.keys()}
        
        # 1. Classify & calculate current value
        for h in current_holdings:
            symbol = h.get('symbol')
            qty = h.get('quantity', 0)
            price = current_prices.get(symbol, h.get('avg_buy_price', 0))
            val = qty * price
            portfolio_value += val
            
            # Simple mock classification logic based on symbols
            # In a real app, this comes from a master stock database
            asset_class = self._classify_symbol(symbol)
            if asset_class in current_allocations_val:
                current_allocations_val[asset_class] += val
                
        if portfolio_value == 0:
            return {"error": "Portfolio value is zero"}

        # 2. Calculate drifts
        drifts = {}
        total_drift_pct = 0.0
        
        for ac, target_weight in self.target_allocations.items():
            current_weight = current_allocations_val[ac] / portfolio_value
            drift = current_weight - target_weight
            drifts[ac] = {
                'target': target_weight,
                'current': current_weight,
                'drift': drift,
                'action_required': abs(drift) > 0.05 # Rebalance if drift > 5%
            }
            total_drift_pct += abs(drift)
            
        # 3. Tax Harvesting considerations (Mocked integration)
        # Using the existing TaxOptimizer logic
        tax_opportunities = self.tax_optimizer.identify_tax_loss_harvest_opportunities(
            current_holdings, current_prices
        )
        
        # 4. Generate Action Plan
        actions = []
        for ac, data in drifts.items():
            if data['action_required']:
                diff_val = data['drift'] * portfolio_value
                if diff_val > 0:
                    actions.append(f"SELL {ac} to reduce exposure by ₹{abs(diff_val):,.0f}")
                else:
                    actions.append(f"BUY {ac} to increase exposure by ₹{abs(diff_val):,.0f}")
                    
        return {
            "portfolio_value": portfolio_value,
            "overall_drift_score": total_drift_pct,
            "requires_rebalance": total_drift_pct > 0.10, # Overall drift > 10%
            "asset_allocation_drifts": drifts,
            "recommended_actions": actions,
            "tax_harvesting_opportunities": len(tax_opportunities)
        }
        
    def _classify_symbol(self, symbol: str) -> str:
        """Mock classification of Indian NSE symbols into asset classes."""
        symbol = symbol.upper()
        if symbol in ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ITC', 'LT']:
            return 'EQUITY:LARGE_CAP'
        elif symbol in ['TATAELXSI', 'DIXON', 'POLYCAB']:
            return 'EQUITY:MID_CAP'
        elif symbol in ['SUZLON', 'ZOMATO', 'IREDA']:
            return 'EQUITY:SMALL_CAP'
        elif symbol in ['GOLDBEES', 'SGB']:
            return 'GOLD'
        else:
            return 'EQUITY:LARGE_CAP' # Default fallback
