"""
Function 2 endpoint: Generate and Execute Query.
"""
from fastapi import APIRouter, HTTPException, Depends
from app.schemas import QueryRequest, GenerateAndRunResponse
from app.services.query_execution_service import generate_and_execute
from app.api.auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/generate-and-run", response_model=GenerateAndRunResponse)
async def generate_and_run_endpoint(request: QueryRequest, current_user = Depends(get_current_user)):
    """
    Function 2: Generate SQL query and execute it safely.
    
    Args:
        request: QueryRequest with natural language question
        
    Returns:
        GenerateAndRunResponse with SQL, results, and execution metadata
    """
    try:
        logger.info(f"Generate and run request: {request.question} (format: {request.output_format})")
        
        response = generate_and_execute(request.question, request.output_format)
        
        return response
    
    except Exception as e:
        logger.error(f"Generate and run failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Query generation and execution failed: {str(e)}"
        )
