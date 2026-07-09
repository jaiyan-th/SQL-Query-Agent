"""
RAG endpoints — schema ingestion and status.

Uses the active SQLite workspace (not a database connection URL).
"""
import datetime
import logging
import os
from typing import Optional
from pathlib import Path

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from pydantic import BaseModel

from app.api.auth import get_current_user
from app.db.connection import get_db
from app.db.models import SqliteWorkspace
from app.rag.ingest import ingest_schema_sqlite
from app.rag.qdrant_client import get_qdrant_client
from app.config import settings
from qdrant_client.http import models

logger = logging.getLogger(__name__)
router = APIRouter()

BASE_DIR = Path(__file__).resolve().parents[2]
SQLITE_STORAGE_DIR = Path(os.getenv("SQLITE_STORAGE_DIR", BASE_DIR / "storage" / "sqlite_workspaces")).resolve()


class RAGStatusResponse(BaseModel):
    schema_indexed: bool
    workspace_id: str = ""
    indexed_table_count: int = 0
    indexed_at: str = ""


class SchemaIngestAPIResponse(BaseModel):
    success: bool
    indexed_tables: Optional[int] = None
    indexed_documents: Optional[int] = None
    workspace_id: Optional[str] = None
    database_type: str = "sqlite"
    message: Optional[str] = None



@router.post("/rag/ingest-schema", response_model=SchemaIngestAPIResponse)
async def ingest_database_schema(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Extract the SQLite schema from the user's active workspace and
    store schema embeddings in Qdrant Cloud.
    """
    workspace = db.query(SqliteWorkspace).filter(
        SqliteWorkspace.user_id == current_user.id,
        SqliteWorkspace.is_active == True,
    ).first()

    if not workspace:
        return SchemaIngestAPIResponse(
            success=False,
            message="Please upload a SQLite database file before indexing schema."
        )

    sqlite_path = Path(workspace.stored_file_path).resolve()
    
    # Debug-safe logging
    logger.info(f"SQLite storage dir resolved: {SQLITE_STORAGE_DIR.as_posix()}")
    logger.info(f"Workspace file exists: {sqlite_path.exists()}")
    if sqlite_path.exists():
        logger.info(f"File size: {sqlite_path.stat().st_size} bytes")
    logger.info(f"Workspace ID: {workspace.id}")
    logger.info(f"Table count: {workspace.table_count}")

    if not sqlite_path.exists():
        return SchemaIngestAPIResponse(
            success=False,
            message="SQLite workspace file is missing. Please re-upload the database."
        )

    if not sqlite_path.is_file():
        return SchemaIngestAPIResponse(
            success=False,
            message="SQLite workspace path is not a valid file."
        )

    if sqlite_path.stat().st_size == 0:
        return SchemaIngestAPIResponse(
            success=False,
            message="SQLite workspace file is empty. Please upload a valid database."
        )

    try:
        engine = create_engine(f"sqlite:///{sqlite_path.as_posix()}")

        result = ingest_schema_sqlite(
            engine=engine,
            user_id=current_user.id,
            workspace_id=workspace.id,
            reset=True,
        )

        # Stamp workspace so /sqlite/active reports schema status
        workspace.schema_indexed = True
        workspace.schema_indexed_at = datetime.datetime.now()
        db.commit()

        return SchemaIngestAPIResponse(
            success=True,
            indexed_tables=result["tables_indexed"],
            indexed_documents=result["documents_created"],
            workspace_id=workspace.id,
            database_type="sqlite",
        )

    except Exception as e:
        logger.error(f"RAG schema ingestion failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Schema ingestion failed: {str(e)}",
        )


@router.get("/rag/status", response_model=RAGStatusResponse)
async def get_rag_status(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Check Qdrant indexing status for the active SQLite workspace.
    """
    workspace = db.query(SqliteWorkspace).filter(
        SqliteWorkspace.user_id == current_user.id,
        SqliteWorkspace.is_active == True,
    ).first()

    if not workspace:
        return RAGStatusResponse(schema_indexed=False)

    sqlite_path = Path(workspace.stored_file_path).resolve()
    if not sqlite_path.exists():
        workspace.is_active = False
        db.commit()
        return RAGStatusResponse(schema_indexed=False)

    try:
        client = get_qdrant_client()
        col_name = settings.QDRANT_COLLECTION_NAME

        count_res = client.count(
            collection_name=col_name,
            count_filter=models.Filter(
                must=[
                    models.FieldCondition(key="user_id", match=models.MatchValue(value=current_user.id)),
                    models.FieldCondition(key="workspace_id", match=models.MatchValue(value=workspace.id)),
                ]
            ),
        )

        indexed = count_res.count > 0
        return RAGStatusResponse(
            schema_indexed=indexed,
            workspace_id=workspace.id,
            indexed_table_count=count_res.count,
            indexed_at=workspace.schema_indexed_at.isoformat() if workspace.schema_indexed_at else "",
        )

    except Exception as e:
        logger.error(f"Failed to query Qdrant schema status: {str(e)}")
        return RAGStatusResponse(
            schema_indexed=False,
            workspace_id=workspace.id,
        )
