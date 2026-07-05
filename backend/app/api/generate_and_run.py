from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from app.schemas import QueryRequest, GenerateAndRunResponse
from app.services.query_execution_service import generate_and_execute
from app.api.auth import get_current_user
from app.db.connection import get_db
from app.db.models import Connection
from app.db.connection_manager import create_user_engine
from app.security.encryption import decrypt_text
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/generate-and-run", response_model=GenerateAndRunResponse)
async def generate_and_run_endpoint(
    request: QueryRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Function 2: Generate SQL, validate safety, execute on user database, and format results.
    """
    # 1. Fetch user's active database connection properties
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
        logger.info(f"Generate & Run SQL request from user {current_user.id} for connection {active_conn.id}")
        
        # 2. Decrypt connection URL backend-only
        decrypted_url = decrypt_text(active_conn.encrypted_database_url)
        
        # 3. Create database engine live
        engine = create_user_engine(decrypted_url)
        
        # 4. Execute query generation and execution service
        response = generate_and_execute(
            db=db,
            user_id=current_user.id,
            connection_id=active_conn.id,
            database_type=active_conn.database_type,
            engine=engine,
            question=request.question
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Generate & Run execution failure: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Query execution failed: {str(e)}"
        )
