"""
Request logging middleware for security audit trails.
Logs: timestamp, method, path, status code, client IP, response time.
"""
import time
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)

logger = logging.getLogger("invex.requests")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Logs every inbound request with timing and client IP.
    Flags suspicious patterns (burst rate, unusual agents) at WARNING level.
    """

    SENSITIVE_PATHS = {"/api/v1/agents/run", "/api/v1/portfolio"}

    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.perf_counter()
        client_ip = self._get_client_ip(request)

        response: Response = await call_next(request)

        duration_ms = (time.perf_counter() - start) * 1000
        status = response.status_code

        log_msg = (
            f"{request.method} {request.url.path} "
            f"→ {status} | {duration_ms:.1f}ms | {client_ip}"
        )

        # Escalate sensitive endpoints or errors
        if status >= 500:
            logger.error(f"[SERVER ERROR] {log_msg}")
        elif status == 429:
            logger.warning(f"[RATE LIMITED] {log_msg}")
        elif status >= 400:
            logger.warning(f"[CLIENT ERROR] {log_msg}")
        elif request.url.path in self.SENSITIVE_PATHS:
            logger.info(f"[SENSITIVE] {log_msg}")
        else:
            logger.info(log_msg)

        # Add security headers to every response
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        return response

    def _get_client_ip(self, request: Request) -> str:
        """Resolve real IP, respecting X-Forwarded-For from trusted proxies."""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # Take the first (leftmost) IP — the original client
            return forwarded_for.split(",")[0].strip()
        if request.client:
            return request.client.host
        return "unknown"
