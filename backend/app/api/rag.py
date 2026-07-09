"""
RAG endpoints — schema ingestion and status.

Uses the active SQLite workspace (not a database connection URL).
"""
import datetime
import logging

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


class RAGStatusResponse(BaseModel):
    schema_indexed: bool
    workspace_id: str = ""
    indexed_table_count: int = 0
    indexed_at: str = ""


class SchemaIngestAPIResponse(BaseModel):
    success: bool
    indexed_tables: int
    indexed_documents: int
    workspace_id: str
    database_type: str = "sqlite"


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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Please upload a SQLite database file before indexing schema.",
        )

    import os
    if not os.path.exists(workspace.stored_file_path):
        workspace.is_active = False
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Active SQLite database file was not found on the server. Please re-upload your SQLite database file.",
        )

    try:
        # Build a read-only SQLite engine from the stored file path
        sqlite_uri = f"file:{workspace.stored_file_path}?mode=ro"
        engine = create_engine(
            f"sqlite:///{sqlite_uri}",
            connect_args={"uri": True},
        )

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

    import os
    if not os.path.exists(workspace.stored_file_path):
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
