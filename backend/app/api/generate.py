"""
Function 1 endpoint: Generate Query (no execution).
"""
from fastapi import APIRouter, HTTPException, Depends
from app.schemas import QueryRequest, GenerateQueryResponse
from app.services.query_generation_service import generate_query
from app.api.auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/generate-query", response_model=GenerateQueryResponse)
async def generate_query_endpoint(request: QueryRequest, current_user = Depends(get_current_user)):
    """
    Function 1: Generate SQL query without execution.
    
    Args:
        request: QueryRequest with natural language question
        
    Returns:
        GenerateQueryResponse with SQL, explanation, and metadata
    """
    try:
        logger.info(f"Generate query request: {request.question}")
        
        response = generate_query(request.question)
        
        return response
    
    except Exception as e:
        logger.error(f"Generate query failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Query generation failed: {str(e)}"
        )
