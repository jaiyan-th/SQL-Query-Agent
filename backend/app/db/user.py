from sqlalchemy.orm import Session
from app.db.models import User

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
