from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from mangum import Mangum
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from config import get_settings
from routers import agent_router, session_router, document_router, market_router, news_router, portfolio_router, alert_router, onboarding_router, earnings_router, research_router
from models.database import engine, Base
from middleware.request_logger import RequestLoggingMiddleware

settings = get_settings()

# ── Rate limiter (shared instance, imported by routers) ─────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up Invex SaaS API...")
    Base.metadata.create_all(bind=engine)
    yield
    print("Shutting down...")

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    lifespan=lifespan,
    # Hide docs in production to reduce attack surface
    docs_url="/api/docs" if settings.ENV == "development" else None,
    redoc_url="/api/redoc" if settings.ENV == "development" else None,
)

# ── Attach limiter to app state ──────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Middleware: order matters — logging wraps everything first ───────────────
app.add_middleware(RequestLoggingMiddleware)

# ── CORS ─────────────────────────────────────────────────────────────────────
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(agent_router.router,      prefix="/api/v1")
app.include_router(session_router.router,    prefix="/api/v1")
app.include_router(document_router.router,   prefix="/api/v1")
app.include_router(market_router.router,     prefix="/api/v1")
app.include_router(news_router.router,       prefix="/api/v1")
app.include_router(portfolio_router.router,  prefix="/api/v1")
app.include_router(alert_router.router,      prefix="/api/v1")
app.include_router(onboarding_router.router, prefix="/api/v1")
app.include_router(earnings_router.router,   prefix="/api/v1")
app.include_router(research_router.router,   prefix="/api/v1")

# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0", "env": settings.ENV}

# ── Lambda Handler ────────────────────────────────────────────────────────────
handler = Mangum(app, lifespan="off")

