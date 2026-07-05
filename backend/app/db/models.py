from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, BigInteger, func
from sqlalchemy.orm import relationship
from app.db.connection import Base
import uuid as _uuid
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Text

class User(Base):
    """SQLAlchemy model for platform users."""
    __tablename__ = "querygen_users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    sqlite_workspaces = relationship("SqliteWorkspace", back_populates="user", cascade="all, delete-orphan")
    histories = relationship("QueryHistory", back_populates="user", cascade="all, delete-orphan")


class SqliteWorkspace(Base):
    """
    SQLite workspace — stores metadata for an uploaded SQLite database file.
    The actual file is stored on disk; Neon PostgreSQL holds only metadata.
    """
    __tablename__ = "querygen_sqlite_workspaces"

    id = Column(String, primary_key=True, default=lambda: str(_uuid.uuid4()), index=True)
    user_id = Column(Integer, ForeignKey("querygen_users.id", ondelete="CASCADE"), nullable=False)
    original_filename = Column(String, nullable=False)
    stored_file_path = Column(Text, nullable=False)   # server-side path — never sent to frontend
    file_size_bytes = Column(BigInteger, nullable=False)
    table_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    schema_indexed = Column(Boolean, default=False)
    schema_indexed_at = Column(DateTime, nullable=True)
    uploaded_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="sqlite_workspaces")
    histories = relationship("QueryHistory", back_populates="workspace", cascade="all, delete-orphan")


class QueryHistory(Base):
    """SQLAlchemy model for tracking executed/generated queries metadata."""
    __tablename__ = "querygen_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("querygen_users.id", ondelete="CASCADE"), nullable=False)
    workspace_id = Column(String, ForeignKey("querygen_sqlite_workspaces.id", ondelete="SET NULL"), nullable=True)
    question = Column(String, nullable=False)
    generated_sql = Column(String, nullable=False)
    mode = Column(String, nullable=False)        # generate, execute
    output_format = Column(String, nullable=False, default="table")
    status = Column(String, nullable=False)      # success, error, blocked
    row_count = Column(Integer, nullable=True)
    execution_time_ms = Column(Integer, nullable=True)
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="histories")
    workspace = relationship("SqliteWorkspace", back_populates="histories")
