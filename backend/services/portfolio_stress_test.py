import numpy as np
from typing import Dict, Any

class PortfolioStressTester:
    """
    Advanced Portfolio Stress Tester using Monte Carlo simulations
    for interactive 'What-If' scenarios.
    """
    
    @staticmethod
    def run_monte_carlo(current_value: float, expected_return: float, volatility: float, 
                        years: float = 1.0, num_simulations: int = 1000) -> Dict[str, Any]:
        """
        Run Monte Carlo simulation to project portfolio value.
        Uses Geometric Brownian Motion (GBM).
        """
        # Convert annual metrics to daily
        dt = 1 / 252
        num_days = int(years * 252)
        
        # Array to store all price paths
        paths = np.zeros((num_days, num_simulations))
        paths[0] = current_value
        
        # Pre-compute random shocks (Z)
        # Using a standard normal distribution
        z = np.random.standard_normal((num_days - 1, num_simulations))
        
        # Calculate drift and shock terms
        drift = (expected_return - 0.5 * volatility**2) * dt
        shock = volatility * np.sqrt(dt) * z
        
        # Apply GBM formula vectorized across all paths
        # S_t = S_{t-1} * exp(drift + shock)
        growth_factors = np.exp(drift + shock)
        paths[1:] = current_value * np.cumprod(growth_factors, axis=0)
        
        final_values = paths[-1]
        
        # Extract percentiles
        worst_case = np.percentile(final_values, 5)   # 5th percentile
        median_case = np.percentile(final_values, 50) # Median
        best_case = np.percentile(final_values, 95)   # 95th percentile
        
        # Sample paths for frontend visualization (e.g., 5 representative paths)
        # We'll pick paths closest to percentiles: 5th, 25th, 50th, 75th, 95th
        percentiles_to_fetch = [5, 25, 50, 75, 95]
        target_vals = np.percentile(final_values, percentiles_to_fetch)
        
        sampled_paths = []
        for tv in target_vals:
            # Find the path whose final value is closest to the target percentile final value
            idx = (np.abs(final_values - tv)).argmin()
            # Convert the path array to standard float list
            sampled_paths.append([float(x) for x in paths[:, idx]])
            
        return {
            'simulations_run': num_simulations,
            'time_horizon_years': years,
            'current_value': current_value,
            'projections': {
                'worst_case_5th_pct': float(worst_case),
                'median_50th_pct': float(median_case),
                'best_case_95th_pct': float(best_case)
            },
            'projected_returns_pct': {
                'worst_case': float((worst_case / current_value - 1) * 100),
                'median': float((median_case / current_value - 1) * 100),
                'best_case': float((best_case / current_value - 1) * 100)
            },
            'sampled_paths': sampled_paths # List of 5 lists of daily values for charting
        }

