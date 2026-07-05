"""
RAG schema ingestion endpoint.
"""
from fastapi import APIRouter, HTTPException, Depends
from app.schemas import SchemaIngestResponse
from app.rag.ingest import ingest_schema
from app.api.auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/rag/ingest-schema", response_model=SchemaIngestResponse)
async def ingest_database_schema(current_user = Depends(get_current_user)):
    """
    Introspect database schema and ingest into Qdrant Cloud.
    
    Returns:
        SchemaIngestResponse with ingestion statistics
        
    Raises:
        HTTPException: If ingestion fails
    """
    try:
        result = ingest_schema(reset=True)
        
        return SchemaIngestResponse(
            status=result["status"],
            vector_store="Qdrant",
            collection_name=result["collection"],
            indexed_tables=result["tables_indexed"],
            indexed_documents=result["documents_created"]
        )
    
    except Exception as e:
        logger.error(f"Schema ingestion failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Schema ingestion failed: {str(e)}"
        )
