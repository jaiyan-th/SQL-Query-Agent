"""
Health check endpoint.
Returns backend status, database connectivity, and Qdrant index status.
"""
from fastapi import APIRouter
from app.config import settings
from app.rag.qdrant_client import get_collection_status
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health")
async def health_check():
    """
    Full system health check.

    Returns:
        Dict with status, app info, database configuration, and Qdrant status.
    """
    # Check Qdrant status (non-blocking)
    qdrant_status = {"status": "unknown", "document_count": 0, "collection": settings.QDRANT_COLLECTION_NAME}
    try:
        qdrant_status = get_collection_status()
    except Exception as e:
        logger.warning(f"Qdrant health check failed: {e}")
        qdrant_status = {
            "status": "error",
            "collection": settings.QDRANT_COLLECTION_NAME,
            "document_count": 0,
            "error": str(e)
        }

    # Check database configuration (not connectivity — that's /connection/test)
    db_configured = bool(settings.DATABASE_URL)

    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "environment": settings.APP_ENV,
        "llm_provider": settings.LLM_PROVIDER,
        "database": {
            "configured": db_configured,
            "type": "postgresql",
        },
        "qdrant": {
            "status": qdrant_status.get("status", "unknown"),
            "collection_name": qdrant_status.get("collection", settings.QDRANT_COLLECTION_NAME),
            "document_count": qdrant_status.get("document_count", 0),
            "indexed": qdrant_status.get("indexed", False),
        },
        "guardrails": {
            "allow_write": settings.ALLOW_WRITE,
            "default_limit": settings.DEFAULT_LIMIT,
            "max_rows": settings.MAX_ROWS,
            "query_timeout_seconds": settings.QUERY_TIMEOUT_SECONDS,
        }
    }


@router.get("/settings/llm-status")
async def get_llm_status():
    """
    Get configured status of LLM providers.
    """
    return {
        "groq_configured": bool(settings.GROQ_API_KEY.strip()) if settings.GROQ_API_KEY else False,
        "gemini_configured": bool(settings.GEMINI_API_KEY.strip()) if settings.GEMINI_API_KEY else False,
        "primary_provider": "groq",
        "fallback_provider": "gemini"
    }

