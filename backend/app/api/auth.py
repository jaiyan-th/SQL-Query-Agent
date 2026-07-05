from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db.connection import get_db
from app.db.user import get_user_by_email
from app.schemas import UserSignupRequest, UserLoginRequest, UserResponse, TokenResponse
from app.services.auth_service import register_new_user, authenticate_user
from app.security import decode_access_token
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# OAuth2 scheme for JWT token extraction
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    Security dependency to validate access token and return current logged-in user.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired access token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception
    user = get_user_by_email(db, email)
    if user is None:
        raise credentials_exception
    return user

@router.post("/auth/signup", response_model=UserResponse)
def signup(request: UserSignupRequest, db: Session = Depends(get_db)):
    """Register a new user account."""
    try:
        user = register_new_user(db, request)
        logger.info(f"Successfully registered new user: {user.email}")
        return user
    except ValueError as e:
        logger.warning(f"Registration validation failed: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Registration failed: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Registration failed")

@router.post("/auth/login", response_model=TokenResponse)
def login(request: UserLoginRequest, db: Session = Depends(get_db)):
    """Authenticate credentials and return a JWT access token."""
    try:
        auth_data = authenticate_user(db, request)
        logger.info(f"User authenticated successfully: {request.email}")
        return auth_data
    except ValueError as e:
        logger.warning(f"Authentication failed: {str(e)}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except Exception as e:
        logger.error(f"Authentication failed: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Authentication failed")

@router.get("/auth/me", response_model=UserResponse)
def get_me(current_user=Depends(get_current_user)):
    """Get profile details of current authenticated user."""
    return current_user
