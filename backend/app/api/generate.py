"""
Function 1: Generate SQLite SQL from natural language (no execution).
"""
import logging

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session

from app.schemas import QueryRequest, GenerateQueryResponse
from app.services.query_generation_service import generate_query
from app.api.auth import get_current_user
from app.db.connection import get_db
from app.db.models import SqliteWorkspace

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/generate-query", response_model=GenerateQueryResponse)
async def generate_query_endpoint(
    request: QueryRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Function 1: Generate SQLite SQL from a natural language question.
    Uses the active SQLite workspace for RAG-grounded generation.
    Does not execute the query.
    """
    workspace = db.query(SqliteWorkspace).filter(
        SqliteWorkspace.user_id == current_user.id,
        SqliteWorkspace.is_active == True,
    ).first()

    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Please upload a SQLite database file before asking questions.",
        )

    if not workspace.schema_indexed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please extract and index your SQLite schema before asking questions.",
        )

    try:
        logger.info(
            f"Generate SQL: user={current_user.id}, workspace={workspace.id}"
        )
        return generate_query(
            db=db,
            user_id=current_user.id,
            workspace_id=workspace.id,
            database_type="sqlite",
            question=request.question,
        )
    except Exception as e:
        logger.error(f"Generate query failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Query generation failed: {str(e)}")
