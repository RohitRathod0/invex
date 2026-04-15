import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    APP_NAME: str = "Invex SaaS API"
    ENV: str = "development"
    AWS_REGION: str = "us-east-1"
    
    # Database
    DATABASE_URL: str = "sqlite:///./invex.db" # Default fallback, should be overridden in .env with postgresql://...
    
    # AWS Credentials (optional in prod if using IAM roles)
    AWS_ACCESS_KEY_ID: str | None = None
    AWS_SECRET_ACCESS_KEY: str | None = None
    
    # Infrastructure
    INVEX_S3_BUCKET_NAME: str = "invex-knowledge-bucket"
    INVEX_DYNAMODB_TABLE_SESSIONS: str = "invex-sessions"
    INVEX_DYNAMODB_TABLE_RUNS: str = "invex-runs"
    INVEX_DYNAMODB_TABLE_DOCUMENTS: str = "invex-documents"
    
    # CrewAI / LLM
    OPENAI_API_KEY: str | None = None
    GROQ_API_KEY: str | None = None
    ELEVENLABS_API_KEY: str | None = None

    # Security
    SECURITY_SECRET: str = "change-me-in-production-please"  # Used for Fernet key derivation
    JWT_SECRET: str = "change-me-jwt-secret"                  # Signing JWTs
    ENABLE_2FA: bool = True                                    # Toggle OTP requirement
    ENABLE_REQUEST_SIGNING: bool = False                       # Enable HMAC header verification

    # CORS — explicit whitelist. Add prod domain here when deploying.
    # Dev ports: 5173 (Vite), 3000 (Next.js)
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Rate limiting (slowapi)
    # Override these in .env for production
    RATE_LIMIT_AGENT: str = "3/hour"       # AI report generation
    RATE_LIMIT_PORTFOLIO: str = "30/minute" # Portfolio CRUD
    RATE_LIMIT_MARKET: str = "60/minute"    # Price / history lookups

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

@lru_cache
def get_settings():
    return Settings()
