from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from contextlib import asynccontextmanager
from config import get_settings
from routers import agent_router, session_router, document_router, market_router, news_router

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load AWS clients, check db connection
    print("Starting up Invex SaaS API...")
    yield
    # Shutdown
    print("Shutting down...")

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(agent_router.router, prefix="/api/v1")
app.include_router(session_router.router, prefix="/api/v1")
app.include_router(document_router.router, prefix="/api/v1")
app.include_router(market_router.router, prefix="/api/v1")
app.include_router(news_router.router, prefix="/api/v1")

# CORS Configuration
# Split by comma if strictly comma separated, or just use list
origins = settings.ALLOWED_ORIGINS.split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

# Lambda Handler
handler = Mangum(app, lifespan="off")
