from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from app.api.auth import get_current_user
from app.db.connection import get_db
from app.db.models import Connection
from app.db.connection_manager import create_user_engine
from app.security.encryption import decrypt_text
from app.rag.ingest import ingest_schema
from app.rag.qdrant_client import get_qdrant_client
from app.config import settings
from qdrant_client.http import models
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

class RAGStatusResponse(BaseModel):
    indexed: bool
    connection_id: int
    indexed_tables: int
    indexed_documents: int

class SchemaIngestAPIResponse(BaseModel):
    success: bool
    indexed_tables: int
    indexed_documents: int
    connection_id: int
    database_type: str

@router.post("/rag/ingest-schema", response_model=SchemaIngestAPIResponse)
async def ingest_database_schema(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Introspect the user's active database schema and ingest schema embeddings into Qdrant Cloud.
    """
    # 1. Get user's active database connection
    active_conn = db.query(Connection).filter(
        Connection.user_id == current_user.id,
        Connection.is_active == True
    ).first()
    
    if not active_conn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active database connection found. Set up and save a connection first."
        )
        
    try:
        # 2. Decrypt database URL backend-only
        decrypted_url = decrypt_text(active_conn.encrypted_database_url)
        
        # 3. Compile dynamic connection engine
        engine = create_user_engine(decrypted_url)
        
        # 4. Ingest schemas into Qdrant
        result = ingest_schema(
            engine=engine,
            user_id=current_user.id,
            connection_id=active_conn.id,
            database_type=active_conn.database_type,
            reset=True
        )
        
        return SchemaIngestAPIResponse(
            success=True,
            indexed_tables=result["tables_indexed"],
            indexed_documents=result["documents_created"],
            connection_id=active_conn.id,
            database_type=active_conn.database_type
        )
        
    except Exception as e:
        logger.error(f"RAG schema ingestion failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Schema ingestion failed: {str(e)}"
        )

@router.get("/rag/status", response_model=RAGStatusResponse)
async def get_rag_status(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Check if the user's active database schema has been indexed in Qdrant.
    """
    # 1. Get active connection
    active_conn = db.query(Connection).filter(
        Connection.user_id == current_user.id,
        Connection.is_active == True
    ).first()
    
    if not active_conn:
        return RAGStatusResponse(
            indexed=False,
            connection_id=0,
            indexed_tables=0,
            indexed_documents=0
        )
        
    try:
        # 2. Query Qdrant count filtered by user/connection
        client = get_qdrant_client()
        col_name = settings.QDRANT_COLLECTION_NAME
        
        count_res = client.count(
            collection_name=col_name,
            count_filter=models.Filter(
                must=[
                    models.FieldCondition(key="user_id", match=models.MatchValue(value=current_user.id)),
                    models.FieldCondition(key="connection_id", match=models.MatchValue(value=active_conn.id))
                ]
            )
        )
        
        indexed_count = count_res.count
        
        return RAGStatusResponse(
            indexed=indexed_count > 0,
            connection_id=active_conn.id,
            indexed_tables=indexed_count,
            indexed_documents=indexed_count
        )
    except Exception as e:
        logger.error(f"Failed to query Qdrant schema status: {str(e)}")
        # If Qdrant collection is missing or fails, return not indexed
        return RAGStatusResponse(
            indexed=False,
            connection_id=active_conn.id,
            indexed_tables=0,
            indexed_documents=0
        )
