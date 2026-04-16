import pandas as pd
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import random
import logging

logger = logging.getLogger(__name__)

# ─── Anonymized insider role pools ───────────────────────────────────────────
# NOTE: We intentionally do NOT store or display real individual names.
# In SEBI PIT disclosures, names ARE publicly filed — but since this demo uses
# synthetic data, using real names could be defamatory/misleading.
# Production integration should pull directly from NSE/BSE PIT filings where
# the name is already a legally mandated public disclosure by the company.
#
# Here we represent insiders by their ROLE CATEGORY only.
PROMOTER_IDS = [
    {"name": "Promoter Entity A",  "category": "Promoter"},
    {"name": "Promoter Entity B",  "category": "Promoter"},
    {"name": "Promoter Group - I", "category": "Promoter"},
]

DIRECTOR_IDS = [
    {"name": "Director 1", "category": "Director"},
    {"name": "Director 2", "category": "Director"},
    {"name": "Director 3", "category": "Director"},
]

KMP_IDS = [
    {"name": "KMP-01", "category": "KMP"},
    {"name": "KMP-02", "category": "KMP"},
    {"name": "KMP-03", "category": "KMP"},
]

ALL_PERSONAS = PROMOTER_IDS + DIRECTOR_IDS + KMP_IDS


class InsiderTradingDetector:
    """
    Detects PATTERNS in insider trading disclosures (promoters / directors / KMPs).

    IMPORTANT — Legal Design Principle:
    ─────────────────────────────────────
    This service reports ROLE-BASED aggregated patterns only (e.g. "Promoter cluster
    buying", "Director accumulation"). It does NOT name or identify specific
    individuals. In production, connect to NSE/BSE PIT bulk-deal feeds where
    each trade is already a legally mandated public disclosure — and even then,
    surface names only in that publicly attributed context.

    Demo mode uses fully synthetic, anonymised data (Promoter Entity A, KMP-01, etc.)
    so there is zero association with any real individual.
    """

    async def fetch_insider_trades(self, symbol: str, days_back: int = 90) -> Dict[str, Any]:
        """
        Fetch insider trades for a symbol and return full analysis.
        """
        trades = self._generate_mock_trades(symbol.upper(), days_back)
        analysis = self.analyze_insider_pattern(trades)
        analysis["symbol"] = symbol.upper()
        analysis["days_back"] = days_back
        analysis["total_trades"] = len(trades)
        analysis["recent_trades"] = trades[:15]
        return analysis

    async def fetch_watchlist_summary(self, symbols: List[str]) -> List[Dict[str, Any]]:
        """
        Scan multiple symbols and return a ranked summary for the watchlist widget.
        """
        results = []
        for sym in symbols:
            trades = self._generate_mock_trades(sym.upper(), 90)
            analysis = self.analyze_insider_pattern(trades)
            patterns = analysis.get("patterns", {})

            # Calculate net flow (buy value - sell value)
            buy_val = patterns.get("promoter_buying", 0) + patterns.get("director_buying", 0)
            sell_val = patterns.get("promoter_selling", 0) + patterns.get("director_selling", 0)

            results.append({
                "symbol": sym.upper(),
                "signal": analysis["overall_signal"],
                "confidence": analysis["confidence"],
                "reason": analysis["reason"],
                "net_flow_cr": round((buy_val - sell_val) / 1e7, 2),  # in Crores
                "total_trades": len(trades),
                "promoter_buying": patterns.get("promoter_buying", 0),
                "promoter_selling": patterns.get("promoter_selling", 0),
                "aggressive_buying": patterns.get("aggressive_buying", False),
                "promoter_accumulation": patterns.get("promoter_accumulation", False),
                "buyers": patterns.get("buyers", []),
            })

        # Sort by confidence descending, bullish first
        signal_rank = {"BULLISH": 3, "NEUTRAL": 2, "BEARISH": 1}
        results.sort(key=lambda x: (signal_rank.get(x["signal"], 0), x["confidence"]), reverse=True)
        return results

    async def backtest_insider_signals(self, symbol: str, years_back: int = 2) -> Dict[str, Any]:
        """
        Simulate backtesting: how accurate were insider buy signals historically?
        """
        days = years_back * 365
        trades = self._generate_mock_trades(symbol.upper(), days)
        buy_trades = [t for t in trades if t["trade_type"] == "BUY"]

        if not buy_trades:
            return {"symbol": symbol, "error": "No buy trades found for backtesting"}

        results = []
        for trade in buy_trades:
            trade_price = trade["price"]
            # Simulate future returns with drift + noise
            seed = hash(trade["id"]) % 10000
            rng = random.Random(seed)

            returns = {}
            for days_fwd, label in [(7, "7d"), (30, "30d"), (90, "90d")]:
                # Realistic return simulation: slight upward bias after insider buy
                drift = rng.gauss(0.015, 0.08)  # mean 1.5% monthly, std 8%
                scale = (days_fwd / 30) ** 0.5
                ret = drift * scale * 100
                returns[label] = round(ret, 2)

            results.append({
                "trade_id": trade["id"],
                "date": trade["date"][:10],
                "person": trade["person_name"],
                "category": trade["person_category"],
                "quantity": trade["quantity"],
                "price_at_trade": trade["price"],
                "returns": returns,
            })

        # Stats
        win_7d  = sum(1 for r in results if r["returns"]["7d"]  > 0) / max(len(results), 1) * 100
        win_30d = sum(1 for r in results if r["returns"]["30d"] > 0) / max(len(results), 1) * 100
        win_90d = sum(1 for r in results if r["returns"]["90d"] > 0) / max(len(results), 1) * 100

        avg_7d  = sum(r["returns"]["7d"]  for r in results) / max(len(results), 1)
        avg_30d = sum(r["returns"]["30d"] for r in results) / max(len(results), 1)
        avg_90d = sum(r["returns"]["90d"] for r in results) / max(len(results), 1)

        quality = "HIGH" if win_30d > 60 else "MEDIUM" if win_30d > 50 else "LOW"

        return {
            "symbol": symbol.upper(),
            "years_back": years_back,
            "total_insider_buys": len(results),
            "win_rate_7d":  round(win_7d, 1),
            "win_rate_30d": round(win_30d, 1),
            "win_rate_90d": round(win_90d, 1),
            "avg_return_7d":  round(avg_7d, 2),
            "avg_return_30d": round(avg_30d, 2),
            "avg_return_90d": round(avg_90d, 2),
            "signal_quality": quality,
            "trades": results[:20],
        }

    # ─── Core analysis ────────────────────────────────────────────────────────

    def analyze_insider_pattern(self, insider_trades: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Detect significant patterns in insider activity."""
        patterns = self._detect_patterns(insider_trades)

        analysis: Dict[str, Any] = {
            "overall_signal": "NEUTRAL",
            "confidence": 50,
            "reason": "Normal insider activity — no strong directional signal",
            "patterns": patterns,
        }

        buyers_count = len(patterns.get("buyers", []))
        pb = patterns.get("promoter_buying", 0)
        ps = patterns.get("promoter_selling", 0)
        db = patterns.get("director_buying", 0)

        if patterns.get("aggressive_buying") and buyers_count >= 2:
            analysis["overall_signal"] = "BULLISH"
            analysis["confidence"] = min(90, 70 + buyers_count * 5)
            analysis["reason"] = f"{buyers_count} insiders buying aggressively within 30 days"
        elif patterns.get("promoter_accumulation"):
            analysis["overall_signal"] = "BULLISH"
            analysis["confidence"] = 72
            analysis["reason"] = "Consistent promoter accumulation detected"
        elif db > 0 and buyers_count >= 2:
            analysis["overall_signal"] = "BULLISH"
            analysis["confidence"] = 65
            analysis["reason"] = f"Director buying cluster — {buyers_count} directors buying"
        elif ps > pb * 2 and ps > 0:
            analysis["overall_signal"] = "BEARISH"
            analysis["confidence"] = 75
            analysis["reason"] = "Promoters selling heavily compared to buying"
        elif patterns.get("coordinated_selling"):
            analysis["overall_signal"] = "BEARISH"
            analysis["confidence"] = 68
            analysis["reason"] = "Multiple insiders selling in a coordinated window"

        return analysis

    def _detect_patterns(self, trades: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Detect specific patterns from trade list."""
        now = datetime.now()
        patterns: Dict[str, Any] = {
            "aggressive_buying": False,
            "coordinated_selling": False,
            "promoter_accumulation": False,
            "buyers": [],
            "sellers": [],
            "promoter_buying": 0.0,
            "promoter_selling": 0.0,
            "director_buying": 0.0,
            "director_selling": 0.0,
        }

        recent_buys = [
            t for t in trades
            if t["trade_type"] == "BUY"
            and (now - datetime.fromisoformat(t["date"])).days <= 30
        ]
        recent_sells = [
            t for t in trades
            if t["trade_type"] == "SELL"
            and (now - datetime.fromisoformat(t["date"])).days <= 30
        ]

        if len(recent_buys) >= 2:
            patterns["aggressive_buying"] = True
            patterns["buyers"] = list(set(t["person_name"] for t in recent_buys))

        if len(recent_sells) >= 3:
            patterns["coordinated_selling"] = True
            patterns["sellers"] = list(set(t["person_name"] for t in recent_sells))

        promoter_trades = [t for t in trades if t["person_category"] == "Promoter"]
        director_trades = [t for t in trades if t["person_category"] in ("Director", "KMP")]

        patterns["promoter_buying"]  = sum(float(t["value"]) for t in promoter_trades if t["trade_type"] == "BUY")
        patterns["promoter_selling"] = sum(float(t["value"]) for t in promoter_trades if t["trade_type"] == "SELL")
        patterns["director_buying"]  = sum(float(t["value"]) for t in director_trades if t["trade_type"] == "BUY")
        patterns["director_selling"] = sum(float(t["value"]) for t in director_trades if t["trade_type"] == "SELL")

        pb = patterns["promoter_buying"]
        ps = patterns["promoter_selling"]
        if pb > 0 and pb > ps * 1.5:
            patterns["promoter_accumulation"] = True

        return patterns

    # ─── Data generation ──────────────────────────────────────────────────────

    def _generate_mock_trades(self, symbol: str, days_back: int) -> List[Dict[str, Any]]:
        """
        Generate deterministic mock trades seeded by symbol so the same symbol
        always produces the same pattern (useful for demo consistency).
        """
        seed = sum(ord(c) for c in symbol)
        rng = random.Random(seed)
        now = datetime.now()

        personas = ALL_PERSONAS  # anonymized role identifiers only

        trend = rng.choice(["BUY_HEAVY", "SELL_HEAVY", "NEUTRAL", "BUY_HEAVY"])  # bias towards buys for demo
        num_trades = rng.randint(8, 20)

        trades = []
        for i in range(num_trades):
            days_ago = rng.randint(1, days_back)
            trade_date = (now - timedelta(days=days_ago)).isoformat()
            persona = rng.choice(personas)

            if trend == "BUY_HEAVY":
                t_type = "BUY" if rng.random() > 0.25 else "SELL"
            elif trend == "SELL_HEAVY":
                t_type = "SELL" if rng.random() > 0.25 else "BUY"
            else:
                t_type = rng.choice(["BUY", "SELL"])

            qty   = rng.randint(1_000, 75_000)
            price = rng.uniform(150.0, 4_000.0)
            value = round(qty * price, 2)

            # Mode of acquisition
            mode = rng.choice(["Market Purchase", "Market Purchase", "Off-Market", "ESOP Exercise", "Gift"])

            trades.append({
                "id":               f"TRD{rng.randint(10000, 99999)}",
                "date":             trade_date,
                "insider_role":     persona["name"],       # role label, NOT a real person's name
                "person_name":      persona["name"],       # kept for backward compat; same value
                "person_category":  persona["category"],
                "designation":      self._get_designation(persona["category"], rng),
                "trade_type":       t_type,
                "quantity":         qty,
                "price":            round(price, 2),
                "value":            value,
                "value_cr":         round(value / 1e7, 2),
                "mode":             mode,
                "post_trade_holding_pct": round(rng.uniform(0.5, 35.0), 2),
            })

        trades.sort(key=lambda x: x["date"], reverse=True)
        return trades

    def _get_designation(self, category: str, rng: random.Random) -> str:
        designations = {
            "Promoter": ["Chairman & MD", "Promoter", "Promoter & Director"],
            "Director": ["Independent Director", "Non-Executive Director", "Executive Director", "Whole-Time Director"],
            "KMP":      ["CFO", "CEO", "Company Secretary", "CTO", "COO"],
        }
        pool = designations.get(category, ["Director"])
        return rng.choice(pool)
