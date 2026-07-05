from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import Session
from app.db.connection import Base

class User(Base):
    """SQLAlchemy model for application users."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # Student, Developer, Data Analyst, Admin, Business User
    created_at = Column(DateTime, server_default=func.now())

def get_user_by_email(db: Session, email: str) -> User | None:
    """Retrieve a user by their email address."""
    return db.query(User).filter(User.email == email.strip().lower()).first()

def create_user(
    db: Session,
    full_name: str,
    email: str,
    password_hash: str,
    role: str
) -> User:
    """Create and save a new user."""
    db_user = User(
        full_name=full_name.strip(),
        email=email.strip().lower(),
        password_hash=password_hash,
        role=role.strip()
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
