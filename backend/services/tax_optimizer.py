from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any

class TaxOptimizer:
    # India tax rates (FY 2024-25)
    STCG_RATE = 0.20  # Short-term capital gains (< 1 year): 20%
    LTCG_RATE = 0.125  # Long-term capital gains (> 1 year): 12.5% above ₹1.25L
    LTCG_EXEMPTION = 125000  # ₹1.25 Lakh exemption
    
    @staticmethod
    def identify_tax_loss_harvest_opportunities(holdings: List[Any], current_prices: Dict[str, float]) -> List[Dict[str, Any]]:
        """Find stocks to sell for tax-loss harvesting"""
        opportunities = []
        now = datetime.now(timezone.utc)
        
        for holding in holdings:
            current_price = current_prices.get(holding.symbol, holding.avg_buy_price)
            current_value = current_price * holding.quantity
            purchase_value = holding.avg_buy_price * holding.quantity
            
            # Must be in loss
            if current_value >= purchase_value:
                continue
            
            unrealized_loss = purchase_value - current_value
            
            # Simplified logic for 'long_term_potential' - if it's an index or large cap, we assume yes.
            # Here we just assume "True" to suggest Sell and Rebuy strategy.
            long_term_potential = True
            
            buy_dt = holding.buy_date.replace(tzinfo=timezone.utc) if holding.buy_date.tzinfo is None else holding.buy_date
            days_held = (now - buy_dt).days
            
            opportunities.append({
                'symbol': holding.symbol,
                'unrealized_loss': float(unrealized_loss),
                'tax_savings': float(unrealized_loss * TaxOptimizer.STCG_RATE), # Offset STCG primarily
                'days_held': days_held,
                'strategy': 'SELL_AND_REBUY' if long_term_potential else 'SELL_ONLY',
                'rebuy_date': (now + timedelta(days=31)).strftime("%Y-%m-%d") if long_term_potential else None
            })
        
        return sorted(opportunities, key=lambda x: x['tax_savings'], reverse=True)
    
    @staticmethod
    def optimize_sale_timing(holdings: List[Any], current_prices: Dict[str, float]) -> Dict[str, Any]:
        """Suggest when to sell based on tax implications"""
        recommendations = []
        now = datetime.now(timezone.utc)
        total_savings = 0.0
        
        for holding in holdings:
            buy_dt = holding.buy_date.replace(tzinfo=timezone.utc) if holding.buy_date.tzinfo is None else holding.buy_date
            days_held = (now - buy_dt).days
            days_to_ltcg = max(0, 365 - days_held)
            
            current_price = current_prices.get(holding.symbol, holding.avg_buy_price)
            current_value = current_price * holding.quantity
            purchase_value = holding.avg_buy_price * holding.quantity
            
            gain = current_value - purchase_value
            
            if gain > 0 and days_to_ltcg > 0 and days_to_ltcg < 90: # Only suggest if within 3 months of LTCG
                # Calculate tax difference
                stcg_tax = gain * TaxOptimizer.STCG_RATE
                # Assuming this specific gain is below the 1.25L exemption, so LTCG tax is 0:
                ltcg_tax = 0.0 if gain <= TaxOptimizer.LTCG_EXEMPTION else (gain - TaxOptimizer.LTCG_EXEMPTION) * TaxOptimizer.LTCG_RATE
                
                tax_savings = stcg_tax - ltcg_tax
                
                if tax_savings > 1000:  # Meaningful savings threshold
                    recommendations.append({
                        'symbol': holding.symbol,
                        'current_gain': float(gain),
                        'days_to_ltcg': days_to_ltcg,
                        'tax_if_sold_now': float(stcg_tax),
                        'tax_if_wait_ltcg': float(ltcg_tax),
                        'savings_by_waiting': float(tax_savings),
                        'recommendation': f"WAIT {days_to_ltcg} days to save ₹{tax_savings:,.0f} in taxes"
                    })
                    total_savings += tax_savings
        
        return {
            'timing_recommendations': recommendations,
            'total_potential_savings': float(total_savings)
        }
    
    @staticmethod
    def calculate_tax_liability(realized_transactions: List[Any], financial_year: str) -> Dict[str, Any]:
        """Mock calculation for realized total tax liability for an FY."""
        # For simplicity, returning a zero state. If the app expands to track transactions 
        # (not just current holdings), this would loop through `Transaction` models.
        stcg_gains = 0.0
        ltcg_gains = 0.0
        
        stcg_tax = max(0, stcg_gains) * TaxOptimizer.STCG_RATE
        ltcg_tax = max(0, (ltcg_gains - TaxOptimizer.LTCG_EXEMPTION)) * TaxOptimizer.LTCG_RATE
        
        return {
            'financial_year': financial_year,
            'stcg_gains': stcg_gains,
            'ltcg_gains': ltcg_gains,
            'ltcg_exemption_used': min(ltcg_gains, TaxOptimizer.LTCG_EXEMPTION),
            'stcg_tax': stcg_tax,
            'ltcg_tax': ltcg_tax,
            'total_tax_liability': stcg_tax + ltcg_tax
        }
