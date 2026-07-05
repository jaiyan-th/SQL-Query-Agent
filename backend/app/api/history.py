from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas import QueryHistoryResponse
from app.db.connection import get_db
from app.db.history import get_history
from app.api.auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/history", response_model=QueryHistoryResponse)
async def get_query_history(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get query history entries for the logged-in user.
    """
    try:
        # Load user history from platform Neon database
        history = get_history(db=db, user_id=current_user.id, limit=limit)
        return QueryHistoryResponse(
            history=history,
            total=len(history)
        )
    except Exception as e:
        logger.error(f"Failed to retrieve history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load query history: {str(e)}"
        )
