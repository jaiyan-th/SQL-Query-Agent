from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.auth import get_current_user
from app.db.connection import get_db
from app.db.models import Connection, User
from app.db.connection_manager import test_user_connection, get_connection_metadata
from app.security.encryption import encrypt_text
from app.schemas import (
    ConnectionTestRequest, 
    ConnectionTestResponse, 
    ConnectionSaveRequest, 
    ConnectionSaveResponse,
    ActiveConnectionResponse
)
import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/connections/test", response_model=ConnectionTestResponse)
async def test_db_connection(
    payload: ConnectionTestRequest,
    current_user = Depends(get_current_user)
):
    """
    Test a user database connection configuration.
    Runs SELECT 1 to verify credentials.
    """
    try:
        result = test_user_connection(payload.database_type, payload.database_url)
        return ConnectionTestResponse(**result)
    except Exception as e:
        logger.error(f"User database connection test failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/connections/save", response_model=ConnectionSaveResponse)
async def save_db_connection(
    payload: ConnectionSaveRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Encrypt and save a new user database connection configuration.
    Sets this connection as active for the user.
    """
    try:
        # 1. Test connection first
        test_res = test_user_connection(payload.database_type, payload.database_url)
        
        # 2. Extract safe metadata
        meta = get_connection_metadata(payload.database_type, payload.database_url)
        
        # 3. Encrypt the database URL
        encrypted_url = encrypt_text(payload.database_url)
        
        # 4. Deactivate existing connections for this user
        db.query(Connection).filter(Connection.user_id == current_user.id).update({"is_active": False})
        
        # 5. Save and activate new connection
        new_conn = Connection(
            user_id=current_user.id,
            connection_name=payload.connection_name.strip(),
            database_type=meta["database_type"],
            encrypted_database_url=encrypted_url,
            masked_database_url=meta["masked_url"],
            host=meta["host"],
            database_name=meta["database_name"],
            provider=meta["provider"],
            is_active=True,
            last_tested_at=datetime.datetime.now()
        )
        
        db.add(new_conn)
        db.commit()
        db.refresh(new_conn)
        
        return ConnectionSaveResponse(
            saved=True,
            connection_id=new_conn.id,
            database_type=new_conn.database_type,
            masked_url=new_conn.masked_database_url,
            host=new_conn.host,
            database_name=new_conn.database_name
        )
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to save user database connection: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/connections/active", response_model=ActiveConnectionResponse)
async def get_active_connection(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Retrieve details of the logged-in user's active database connection.
    Does NOT leak raw or encrypted credentials.
    """
    active_conn = db.query(Connection).filter(
        Connection.user_id == current_user.id,
        Connection.is_active == True
    ).first()
    
    if not active_conn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active database connection configured. Please set up a connection first."
        )
        
    return ActiveConnectionResponse(
        connection_id=active_conn.id,
        connected=True,
        database_type=active_conn.database_type,
        provider=active_conn.provider,
        masked_url=active_conn.masked_database_url,
        host=active_conn.host,
        database_name=active_conn.database_name
    )
