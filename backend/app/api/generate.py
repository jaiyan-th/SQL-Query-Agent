from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from app.schemas import QueryRequest, GenerateQueryResponse
from app.services.query_generation_service import generate_query
from app.api.auth import get_current_user
from app.db.connection import get_db
from app.db.models import Connection
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/generate-query", response_model=GenerateQueryResponse)
async def generate_query_endpoint(
    request: QueryRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Function 1: Generate SQL query from natural language without execution.
    Grounds generation using the user's active connection schema context.
    """
    # 1. Fetch user's active connection
    active_conn = db.query(Connection).filter(
        Connection.user_id == current_user.id,
        Connection.is_active == True
    ).first()
    
    if not active_conn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active database connection configured. Please connect a database first."
        )
        
    try:
        logger.info(f"Generate SQL query request from user {current_user.id} for connection {active_conn.id}")
        
        # 2. Invoke generation pipeline
        response = generate_query(
            db=db,
            user_id=current_user.id,
            connection_id=active_conn.id,
            database_type=active_conn.database_type,
            question=request.question
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Generate query endpoint failure: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Query generation failed: {str(e)}"
        )
