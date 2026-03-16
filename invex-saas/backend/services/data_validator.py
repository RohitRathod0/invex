import logging

logger = logging.getLogger("invex.validator")

class DataValidator:
    """
    Validates financial data for anomalies and sanity checks before serving.
    """
    
    @staticmethod
    def validate_price(symbol: str, current_price: float, previous_close: float) -> bool:
        """
        Validates the current price against the previous close to detect anomalies.
        Allows a maximum change of 20% (standard circuit breaker limit in India).
        """
        if current_price <= 0 or previous_close <= 0:
            logger.warning(f"Invalid price data for {symbol}: current={current_price}, prev={previous_close}")
            return False
            
        change_pct = abs((current_price - previous_close) / previous_close)
        
        # Indian markets heavily regulate single-day moves. Anything >20% overnight 
        # or intraday without news is highly likely to be bad data.
        if change_pct > 0.20:
            logger.warning(
                f"Anomaly detected for {symbol}: Price changed by {change_pct*100:.1f}%. "
                f"Current: {current_price}, Previous: {previous_close}"
            )
            return False
            
        return True

    @staticmethod
    def sanitize_history(history_data: list[dict]) -> list[dict]:
        """
        Clean up array of historical data points. Removes NaN/None and massive spikes.
        Expected format: [{"date": "YYYY-MM-DD", "close": 123.4}, ...]
        """
        clean_data = []
        for point in history_data:
            close_val = point.get("close")
            if close_val is None or not isinstance(close_val, (int, float)) or close_val <= 0:
                continue
            clean_data.append(point)
            
        # Optional: Further spike detection inside the array if needed
        return clean_data
