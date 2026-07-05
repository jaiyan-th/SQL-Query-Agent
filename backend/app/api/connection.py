"""
Database connection testing endpoint.
Validates PostgreSQL connections only.
"""
from fastapi import APIRouter, HTTPException
from app.schemas import ConnectionTestRequest, ConnectionTestResponse
from app.db.connection import test_connection, reset_connection
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/connection/test", response_model=ConnectionTestResponse)
async def test_database_connection(request: ConnectionTestRequest):
    """
    Test PostgreSQL database connection.

    Validates that the provided connection string is a valid PostgreSQL URL
    and that the database is reachable.

    Args:
        request: Connection test request with optional database_url

    Returns:
        ConnectionTestResponse with connection status

    Raises:
        HTTPException: If connection test fails or URL is not PostgreSQL
    """
    try:
        # Validate URL format before attempting connection
        if request.database_url:
            url = request.database_url
            allowed_prefixes = ("postgresql://", "postgres://", "postgresql+psycopg2://")
            if not any(url.startswith(p) for p in allowed_prefixes):
                raise ValueError(
                    "Only PostgreSQL connection strings are supported. "
                    "Format: postgresql://username:password@host:5432/database_name"
                )

        result = test_connection(request.database_url)

        # Only update active engine if connection succeeded
        if result["connected"] and request.database_url:
            reset_connection(request.database_url)

        return ConnectionTestResponse(
            connected=result["connected"],
            database_type=result.get("database_type"),
            message=result["message"]
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Connection test failed: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"PostgreSQL connection failed: {str(e)}"
        )
