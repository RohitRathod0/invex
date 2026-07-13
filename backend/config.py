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
    
    # CrewAI / LLM keys
    OPENAI_API_KEY: str | None = None
    GROQ_API_KEY: str | None = None
    MISTRAL_API_KEY: str | None = None
    GEMINI_API_KEY: str | None = None
    GOOGLE_API_KEY: str | None = None

    # MongoDB (auth + user data)
    MONGO_URI: str = "mongodb://localhost:27017"  # overridden by .env

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


def push_llm_keys_to_environ() -> None:
    """Push LLM API keys from .env into os.environ so inline crew_core imports can read them."""
    s = get_settings()
    key_map = {
        "MISTRAL_API_KEY": s.MISTRAL_API_KEY,
        "GROQ_API_KEY":    s.GROQ_API_KEY,
        "GEMINI_API_KEY":  s.GEMINI_API_KEY,
        "GOOGLE_API_KEY":  s.GOOGLE_API_KEY,
        "OPENAI_API_KEY":  s.OPENAI_API_KEY,
    }
    for k, v in key_map.items():
        if v and not os.environ.get(k):
            os.environ[k] = v
