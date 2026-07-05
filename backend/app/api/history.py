"""
Query history endpoint.
"""
from fastapi import APIRouter, Depends
from app.schemas import QueryHistoryResponse
from app.db.history import get_history
from app.api.auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/history", response_model=QueryHistoryResponse)
async def get_query_history(limit: int = 50, current_user = Depends(get_current_user)):
    """
    Get query history.
    
    Args:
        limit: Maximum number of entries to return
        
    Returns:
        QueryHistoryResponse with history entries
    """
    try:
        history = get_history(limit=limit)
        
        return QueryHistoryResponse(
            history=history,
            total=len(history)
        )
    
    except Exception as e:
        logger.error(f"Failed to retrieve history: {str(e)}")
        return QueryHistoryResponse(history=[], total=0)
