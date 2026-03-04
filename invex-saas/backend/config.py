import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    APP_NAME: str = "Invex SaaS API"
    ENV: str = "development"
    AWS_REGION: str = "us-east-1"
    
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
    
    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

@lru_cache
def get_settings():
    return Settings()
