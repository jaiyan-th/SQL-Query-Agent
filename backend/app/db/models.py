from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, func
from sqlalchemy.orm import relationship
from app.db.connection import Base

class User(Base):
    """SQLAlchemy model for platform users."""
    __tablename__ = "querygen_users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # Student, Developer, Data Analyst, Admin, Business User
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    connections = relationship("Connection", back_populates="user", cascade="all, delete-orphan")
    histories = relationship("QueryHistory", back_populates="user", cascade="all, delete-orphan")

class Connection(Base):
    """SQLAlchemy model for user database connections."""
    __tablename__ = "querygen_connections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("querygen_users.id", ondelete="CASCADE"), nullable=False)
    connection_name = Column(String, nullable=False)
    database_type = Column(String, nullable=False)  # postgresql, mysql, mariadb, sqlite, mssql
    encrypted_database_url = Column(String, nullable=False)
    masked_database_url = Column(String, nullable=False)
    host = Column(String, nullable=False)
    database_name = Column(String, nullable=False)
    provider = Column(String, nullable=False)  # PostgreSQL, MySQL, MariaDB, SQLite, SQL Server
    is_active = Column(Boolean, default=False)
    last_tested_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="connections")
    histories = relationship("QueryHistory", back_populates="connection", cascade="all, delete-orphan")

class QueryHistory(Base):
    """SQLAlchemy model for tracking executed/generated queries metadata."""
    __tablename__ = "querygen_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("querygen_users.id", ondelete="CASCADE"), nullable=False)
    connection_id = Column(Integer, ForeignKey("querygen_connections.id", ondelete="SET NULL"), nullable=True)
    question = Column(String, nullable=False)
    generated_sql = Column(String, nullable=False)
    mode = Column(String, nullable=False)  # generate, execute
    output_format = Column(String, nullable=False)  # table, bar_chart, pie_chart, text, report, analysis, auto
    status = Column(String, nullable=False)  # success, error, blocked
    row_count = Column(Integer, nullable=True)
    execution_time_ms = Column(Integer, nullable=True)
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="histories")
    connection = relationship("Connection", back_populates="histories")
