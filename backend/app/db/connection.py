"""
Database connection management using SQLAlchemy.
Production-only: Neon PostgreSQL via DATABASE_URL.
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from sqlalchemy.pool import QueuePool
from typing import Optional
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Declarative base class for models
Base = declarative_base()

# Global engine instance
_engine = None
_SessionLocal = None


def get_engine(database_url: Optional[str] = None):
    """
    Get or create SQLAlchemy engine for PostgreSQL.

    Args:
        database_url: Optional database URL, defaults to settings.DATABASE_URL

    Returns:
        SQLAlchemy engine instance

    Raises:
        ValueError: If DATABASE_URL is not configured or is not PostgreSQL
    """
    global _engine

    url = database_url or settings.DATABASE_URL

    if not url:
        raise ValueError(
            "DATABASE_URL is not configured. "
            "Set DATABASE_URL=postgresql://username:password@host:5432/database_name "
            "in your environment variables."
        )

    allowed_prefixes = ("postgresql://", "postgres://", "postgresql+psycopg2://")
    if not any(url.startswith(p) for p in allowed_prefixes):
        raise ValueError(
            f"DATABASE_URL must be a PostgreSQL connection string. "
            f"Got: {url[:30]}..."
        )

    # If it is a transient database connection test/custom request, do not mutate global cache
    if database_url is not None:
        return create_engine(
            url,
            poolclass=QueuePool,
            pool_size=1,
            max_overflow=0,
            pool_timeout=10,
            pool_recycle=300,
            pool_pre_ping=True,
            echo=settings.APP_ENV == "development"
        )

    # For default server operations, cache engine globally
    if _engine is None:
        _engine = create_engine(
            url,
            poolclass=QueuePool,
            pool_size=5,
            max_overflow=10,
            pool_timeout=30,
            pool_recycle=300,
            pool_pre_ping=True,
            echo=settings.APP_ENV == "development"
        )
        logger.info(f"Created PostgreSQL engine for: {_engine.url.host}")

    return _engine


def get_session_maker(database_url: Optional[str] = None):
    """
    Get SQLAlchemy session maker.

    Args:
        database_url: Optional database URL

    Returns:
        SessionLocal class for creating sessions
    """
    global _SessionLocal

    engine = get_engine(database_url)

    if _SessionLocal is None:
        _SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=engine
        )

    return _SessionLocal


def get_db() -> Session:
    """
    Dependency for getting database session.
    Use with FastAPI Depends().

    Yields:
        Database session
    """
    SessionLocal = get_session_maker()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_connection(database_url: Optional[str] = None) -> dict:
    """
    Test database connection.

    Args:
        database_url: Optional database URL to test

    Returns:
        Dict with connection status and info

    Raises:
        Exception: If connection fails
    """
    engine = get_engine(database_url)

    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version_row = result.fetchone()
            version = version_row[0] if version_row else "unknown"

        return {
            "connected": True,
            "database_type": "postgresql",
            "database": engine.url.database,
            "message": f"PostgreSQL connection successful. Version: {version[:50]}"
        }

    except Exception as e:
        logger.error(f"PostgreSQL connection failed: {str(e)}")
        raise Exception(f"PostgreSQL connection failed: {str(e)}")


def reset_connection(database_url: str):
    """
    Reset database connection with new URL.

    Args:
        database_url: New PostgreSQL database URL
    """
    global _engine, _SessionLocal

    if _engine:
        _engine.dispose()

    _engine = None
    _SessionLocal = None

    # Create new connection
    get_engine(database_url)
    get_session_maker(database_url)
