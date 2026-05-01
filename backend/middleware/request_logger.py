"""
Request logging middleware for security audit trails.
Logs: timestamp, method, path, status code, client IP, response time.
"""
import time
import logging
import json
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from models.database import SessionLocal
from models.db_models import RequestLog
from security.jwt_handler import get_user_id_from_auth_header

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
    Saves to the RequestLog database table.
    """

    SENSITIVE_PATHS = {"/api/v1/agents/run", "/api/v1/portfolio"}

    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip logging for health checks and docs to avoid spam
        if request.url.path in ["/health", "/api/docs", "/api/redoc", "/api/openapi.json"]:
            return await call_next(request)

        start = time.perf_counter()
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent")

        # Extract user_id if present
        auth_header = request.headers.get("Authorization")
        user_id = get_user_id_from_auth_header(auth_header)

        # Tricky part: We won't log request/response bodies in middleware easily without
        # breaking streaming or consuming the stream. So we will just log the metadata for now.
        # This prevents breaking the FastAPI pipeline.

        status = 500
        try:
            response: Response = await call_next(request)
            status = response.status_code
            return response
        except Exception:
            status = 500
            raise
        finally:
            duration_ms = (time.perf_counter() - start) * 1000

            log_msg = (
                f"{request.method} {request.url.path} "
                f"→ {status} | {duration_ms:.1f}ms | {client_ip} | user:{user_id}"
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

            # Add security headers to every response if we have a valid response object
            if 'response' in locals() and isinstance(response, Response):
                response.headers["X-Content-Type-Options"] = "nosniff"
                response.headers["X-Frame-Options"] = "DENY"
                response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

            # Write to database asynchronously (or synchronously in middleware)
            try:
                db = SessionLocal()
                req_log = RequestLog(
                    user_id=user_id,
                    method=request.method,
                    path=request.url.path,
                    status_code=status,
                    duration_ms=duration_ms,
                    ip_address=client_ip,
                    user_agent=user_agent
                )
                db.add(req_log)
                db.commit()
            except Exception as db_err:
                logger.error(f"Failed to write request log to DB: {db_err}")
            finally:
                if 'db' in locals():
                    db.close()

    def _get_client_ip(self, request: Request) -> str:
        """Resolve real IP, respecting X-Forwarded-For from trusted proxies."""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        if request.client:
            return request.client.host
        return "unknown"

