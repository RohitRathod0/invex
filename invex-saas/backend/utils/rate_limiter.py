"""
backend/utils/rate_limiter.py

Token-bucket rate limiter for LLM calls.
Prevents 429 errors by tracking TPM (tokens-per-minute) and RPM
(requests-per-minute) in a sliding 60-second window.

Usage:
    from utils.rate_limiter import analysis_limiter, news_limiter

    await analysis_limiter.acquire(estimated_tokens=500)
    response = await litellm.acompletion(...)
"""

import asyncio
import time
from collections import deque


class TokenBucketQueue:
    """
    Async sliding-window rate limiter.

    Tracks both token usage and request count over the last 60 seconds.
    If either limit would be exceeded by the next call, it sleeps until
    the oldest entry drops out of the 60-second window.
    """

    def __init__(self, tpm_limit: int = 8_000, rpm_limit: int = 20):
        self.tpm_limit = tpm_limit
        self.rpm_limit = rpm_limit
        self._token_log: deque[tuple[float, int]] = deque()   # (timestamp, tokens)
        self._req_log: deque[float] = deque()                  # timestamps
        self._lock = asyncio.Lock()

    async def acquire(self, estimated_tokens: int = 500) -> None:
        """
        Block until there is capacity for `estimated_tokens` tokens and
        one more request within the sliding window.
        """
        async with self._lock:
            while True:
                now = time.monotonic()

                # ── Purge entries older than 60 s ──────────────────────────
                while self._token_log and now - self._token_log[0][0] > 60:
                    self._token_log.popleft()
                while self._req_log and now - self._req_log[0] > 60:
                    self._req_log.popleft()

                used_tokens = sum(t for _, t in self._token_log)
                used_reqs = len(self._req_log)

                # ── Compute any necessary wait ────────────────────────────
                wait = 0.0
                if used_tokens + estimated_tokens > self.tpm_limit and self._token_log:
                    # Wait until the oldest token entry falls out of the window
                    wait = max(wait, 60.0 - (now - self._token_log[0][0]) + 0.1)
                if used_reqs >= self.rpm_limit and self._req_log:
                    wait = max(wait, 60.0 - (now - self._req_log[0]) + 0.1)

                if wait <= 0:
                    break

                # Release lock while sleeping so other coroutines can check
                self._lock.release()
                await asyncio.sleep(wait)
                await self._lock.acquire()

            # ── Register this call ────────────────────────────────────────
            ts = time.monotonic()
            self._token_log.append((ts, estimated_tokens))
            self._req_log.append(ts)

    def reset(self) -> None:
        """Clear all window state (useful in tests)."""
        self._token_log.clear()
        self._req_log.clear()


# ---------------------------------------------------------------------------
# Shared singletons — import these rather than instantiating locally
# ---------------------------------------------------------------------------

# Analysis page agents: Gemini Flash free tier = 1M TPM / 1500 RPM
# We keep the limiter conservative (10k TPM / 60 RPM) to stay safe with
# concurrent users; Gemini is far more generous than Groq at these levels.
analysis_limiter = TokenBucketQueue(tpm_limit=10_000, rpm_limit=60)

# News / screener / chat agents: Groq llama-3.1-8b-instant = 6k TPM / 30 RPM
news_limiter = TokenBucketQueue(tpm_limit=5_500, rpm_limit=25)

# Screener agent (llama-3.1-8b-instant on Groq, small calls)
screener_limiter = TokenBucketQueue(tpm_limit=5_500, rpm_limit=25)
