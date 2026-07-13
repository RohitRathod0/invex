from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from mangum import Mangum
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from config import get_settings, push_llm_keys_to_environ
from routers import auth_router, agent_router, session_router, document_router, market_router, news_router, portfolio_router, alert_router, onboarding_router, research_router, chat_router, risk_router
from models.database import engine, Base
from models.mongo import close_mongo
from middleware.request_logger import RequestLoggingMiddleware
import logging
import traceback

logger = logging.getLogger(__name__)

settings = get_settings()

# Push all LLM API keys from .env into os.environ so crew_core
# modules (fast_engine, crew) can reach them via os.environ.get(...)
push_llm_keys_to_environ()

# ── Rate limiter (shared instance, imported by routers) ─────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up Invex SaaS API...")
    Base.metadata.create_all(bind=engine)
    yield
    await close_mongo()
    logger.info("Shutting down...")

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    lifespan=lifespan,
    # Docs available at /docs in development, hidden in production
    docs_url="/docs" if settings.ENV == "development" else None,
    redoc_url="/redoc" if settings.ENV == "development" else None,
    openapi_url="/openapi.json" if settings.ENV == "development" else None,
)

# ── Attach limiter to app state ──────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    err = traceback.format_exc()
    logger.error("GLOBAL EXCEPTION:", exc_info=exc)
    with open("crash_log.txt", "w") as f:
        f.write(err)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc), "trace": err}
    )


# ── Middleware: order matters — logging wraps everything first ───────────────
app.add_middleware(RequestLoggingMiddleware)

# ── CORS ─────────────────────────────────────────────────────────────────────
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
if "http://localhost:3000" not in origins:
    origins.append("http://localhost:3000")
if "http://127.0.0.1:3000" not in origins:
    origins.append("http://127.0.0.1:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth_router.router,       prefix="/api/v1")
app.include_router(agent_router.router,      prefix="/api/v1")
app.include_router(session_router.router,    prefix="/api/v1")
app.include_router(document_router.router,   prefix="/api/v1")
app.include_router(market_router.router,     prefix="/api/v1")
app.include_router(news_router.router,       prefix="/api/v1")
app.include_router(portfolio_router.router,  prefix="/api/v1")
app.include_router(alert_router.router,      prefix="/api/v1")
app.include_router(onboarding_router.router, prefix="/api/v1")
app.include_router(research_router.router,   prefix="/api/v1")
app.include_router(chat_router.router,       prefix="/api/v1")
app.include_router(risk_router.router,       prefix="/api/v1")

# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    return {"status": "healthy-v2", "version": "1.0.0", "env": settings.ENV}

# ── Lambda Handler ────────────────────────────────────────────────────────────
handler = Mangum(app, lifespan="off")

