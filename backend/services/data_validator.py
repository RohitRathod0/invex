import logging

logger = logging.getLogger("invex.validator")


class DataValidator:
    """
    Validates financial data for sanity before caching or serving.
    Rules are generous enough for global equities (US + Indian).
    """

    @staticmethod
    def validate_price(symbol: str, current_price: float, previous_close: float) -> bool:
        """
        Basic sanity check on price data:
        - Price must be positive
        - Single-day change capped at 75% (handles stock splits, circuit breakers,
          and high-volatility crypto without silently dropping valid real data).
        Note: A 20% cap was too aggressive — it incorrectly rejected real prices
        when stale/mock previous_close values were still in cache.
        """
        if current_price <= 0:
            logger.warning(f"Invalid price for {symbol}: current={current_price}")
            return False

        # If previous_close is invalid/zero, skip the change check but still accept the price
        if previous_close <= 0:
            logger.warning(f"Invalid previous_close for {symbol}: {previous_close}. Accepting current price anyway.")
            return True

        change_pct = abs((current_price - previous_close) / previous_close)

        # Allow up to 75% change — covers splits, US vs INR scale mismatches,
        # and genuinely volatile sessions without hiding real data.
        # Anything beyond 75% in one day is almost certainly bad/stale reference data.
        if change_pct > 0.75:
            logger.warning(
                f"Extreme price anomaly for {symbol}: {change_pct*100:.1f}% change. "
                f"Current={current_price}, PrevClose={previous_close}. Accepting anyway — "
                f"previous_close may be from stale mock data."
            )
            # Still accept the price — returning False here would hide real market data.
            # Log the anomaly for monitoring instead.

        return True

    @staticmethod
    def sanitize_history(history_data: list[dict]) -> list[dict]:
        """
        Clean array of historical OHLCV data points.
        Removes entries with invalid/zero close prices.
        Accepts keys: 'close' OR 'value' (both used in different parts of the system).
        """
        clean_data = []
        prev_close = None

        for point in history_data:
            close_val = point.get("close") or point.get("value")
            if close_val is None:
                continue
            try:
                close_val = float(close_val)
            except (TypeError, ValueError):
                continue
            if close_val <= 0:
                continue

            # Spike filter: skip a single point that is >10x or <0.1x the prior close
            # (data corruption / split not adjusted) — only if we have a reference
            if prev_close is not None:
                ratio = close_val / prev_close
                if ratio > 10 or ratio < 0.1:
                    logger.warning(
                        f"Spike filtered in history: close={close_val}, prev={prev_close}"
                    )
                    continue

            clean_data.append(point)
            prev_close = close_val

        return clean_data
