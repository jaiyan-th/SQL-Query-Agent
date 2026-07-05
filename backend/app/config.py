"""
Configuration management for QueryGen AI.

Production stack:
- Platform DB: Neon PostgreSQL (DATABASE_URL)
- Vector DB: Qdrant Cloud
- LLM: Groq primary / Gemini fallback
- User data: Uploaded SQLite files stored on disk
"""
from pydantic_settings import BaseSettings
from pydantic import field_validator, model_validator
from typing import Literal
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App Configuration
    APP_NAME: str = "QueryGen AI"
    APP_ENV: Literal["development", "production", "test"] = "production"

    # LLM Configuration
    LLM_PROVIDER: Literal["groq", "gemini"] = "groq"
    GROQ_API_KEY: str = ""
    GEMINI_API_KEY: str = ""

    # Platform Database — Neon PostgreSQL
    DATABASE_URL: str = ""

    # Qdrant Vector Database Configuration
    QDRANT_URL: str = ""
    QDRANT_API_KEY: str = ""
    QDRANT_COLLECTION_NAME: str = "querygen_schema_vectors"
    QDRANT_EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"

    # Query Execution Limits
    DEFAULT_LIMIT: int = 50
    MAX_ROWS: int = 100
    QUERY_TIMEOUT_SECONDS: int = 30
    MAX_RETRY_ATTEMPTS: int = 2

    # Security
    ALLOW_WRITE: bool = False

    # SQLite workspace storage
    SQLITE_STORAGE_DIR: str = "storage/sqlite_workspaces"
    MAX_SQLITE_UPLOAD_MB: int = 50

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_postgres_url(cls, v: str) -> str:
        if not v:
            return v
        allowed_prefixes = (
            "postgresql://",
            "postgres://",
            "postgresql+psycopg2://",
        )
        if not any(v.startswith(p) for p in allowed_prefixes):
            raise ValueError(
                "DATABASE_URL must be a PostgreSQL connection string "
                "(postgresql://username:password@host:5432/database_name)."
            )
        return v

    @model_validator(mode="after")
    def validate_llm_keys(self) -> 'Settings':
        if self.LLM_PROVIDER == "groq" and not self.GROQ_API_KEY.strip():
            raise ValueError("GROQ_API_KEY is required when LLM_PROVIDER is 'groq'")
        if self.LLM_PROVIDER == "gemini" and not self.GEMINI_API_KEY.strip():
            raise ValueError("GEMINI_API_KEY is required when LLM_PROVIDER is 'gemini'")
        return self

    # Frontend URL (optional)
    VITE_API_BASE_URL: str = ""

    # JWT Authentication
    JWT_SECRET_KEY: str = "replace-with-secure-random-secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 1440

    class Config:
        env_file = "../.env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
