from sqlalchemy.orm import Session
from app.db.user import get_user_by_email, create_user, User
from app.security import verify_password, get_password_hash, create_access_token
from app.schemas import UserSignupRequest, UserLoginRequest
from typing import Dict, Any

def register_new_user(db: Session, request: UserSignupRequest) -> User:
    """
    Business logic for user registration.
    Checks if email already exists, hashes password, and stores user in database.
    """
    existing_user = get_user_by_email(db, request.email)
    if existing_user:
        raise ValueError("User with this email already exists")

    hashed_password = get_password_hash(request.password)
    user = create_user(
        db=db,
        full_name=request.full_name,
        email=request.email,
        password_hash=hashed_password,
        role=request.role
    )
    return user

def authenticate_user(db: Session, request: UserLoginRequest) -> Dict[str, Any]:
    """
    Business logic for user login authentication.
    Validates credentials and returns JWT access token along with user profile metadata.
    """
    user = get_user_by_email(db, request.email)
    if not user:
        raise ValueError("Invalid email or password")

    if not verify_password(request.password, user.password_hash):
        raise ValueError("Invalid email or password")

    # Generate JWT token
    token_data = {
        "sub": user.email,
        "role": user.role,
        "id": user.id
    }
    access_token = create_access_token(data=token_data)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at
        }
    }
