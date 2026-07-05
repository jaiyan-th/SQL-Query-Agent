"""
Pydantic models for API request/response validation.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime


# ── Request Models ────────────────────────────────────────────



class QueryRequest(BaseModel):
    """Request to generate or execute a SQL query."""
    question: str = Field(..., min_length=1, description="Natural language question")



# ── Response Models ───────────────────────────────────────────

class ConnectionTestResponse(BaseModel):
    """Database connection test response."""
    connected: bool
    database_type: Optional[str] = None
    message: Optional[str] = "Connection successful"



class SchemaIngestResponse(BaseModel):
    """Schema ingestion response."""
    status: str
    vector_store: str = "Qdrant"
    collection_name: str
    indexed_tables: int
    indexed_documents: int


class LLMResponse(BaseModel):
    """Structured LLM response for SQL generation."""
    sql: str
    explanation: str
    tables_used: List[str]
    confidence: float = Field(..., ge=0, le=1)
    needs_clarification: bool = False
    clarification_question: Optional[str] = None


class SchemaContext(BaseModel):
    """Retrieved schema context from RAG."""
    table_name: str
    content: str
    relevance_score: float


class GenerateQueryResponse(BaseModel):
    """Response for Function 1: Generate SQL Only (no execution)."""
    mode: str = "generate_only"
    question: str
    generated_sql: str
    explanation: str
    tables_used: List[str]
    confidence: float
    rag_context_used: bool = True
    guardrail_status: str
    safety_status: str
    executed: bool = False
    schema_context: List[SchemaContext] = []


class GenerateAndRunResponse(BaseModel):
    """Response for Function 2: Generate SQL and Execute."""
    mode: str = "generate_and_execute"
    question: str
    generated_sql: str
    explanation: str
    columns: List[str]
    rows: List[Dict[str, Any]]
    row_count: int
    execution_time_ms: Optional[float] = None
    rag_context_used: bool = True
    guardrail_status: str
    safety_status: str
    executed: bool = True
    schema_context: List[SchemaContext] = []


class QueryHistoryItem(BaseModel):
    """Single query history entry."""
    id: int
    question: str
    generated_sql: str
    mode: str
    output_format: str
    status: str
    row_count: Optional[int] = None
    execution_time_ms: Optional[int] = None
    error_message: Optional[str] = None
    created_at: datetime
    database_type: Optional[str] = None
    connection_name: Optional[str] = None


class ConnectionTestRequest(BaseModel):
    """Payload to test connection configuration (full format with explicit type)."""
    database_type: str
    database_url: str


class SimpleConnectionTestRequest(BaseModel):
    """Simplified payload — accepts just connection_url and auto-detects database type."""
    connection_url: str


class ConnectionTestResponse(BaseModel):
    """Response returned for database connection tests."""
    connected: bool
    database_type: Optional[str] = None
    provider: Optional[str] = None
    masked_url: Optional[str] = None
    host: Optional[str] = None
    database_name: Optional[str] = None
    read_only_mode: bool = True
    message: Optional[str] = "Connection successful"
    success: Optional[bool] = None  # alias for 'connected' for frontend compat


class ConnectionSaveRequest(BaseModel):
    """Payload to save database connection credentials."""
    connection_name: Optional[str] = "My Database"
    database_type: Optional[str] = None  # auto-detected from URL if omitted
    database_url: Optional[str] = None   # used with explicit database_type
    connection_url: Optional[str] = None  # simplified format — auto-detects type


class ConnectionSaveResponse(BaseModel):
    """Response returned after connection properties are encrypted and saved."""
    saved: bool
    success: Optional[bool] = None  # alias for 'saved' for frontend compat
    connection_id: int
    database_type: str
    masked_url: str
    host: str
    database_name: str
    message: Optional[str] = "Connection saved successfully."


class ActiveConnectionResponse(BaseModel):
    """Details of active database configurations."""
    connection_id: int
    connected: bool
    database_type: str
    provider: str
    masked_url: str
    host: str
    database_name: str



class QueryHistoryResponse(BaseModel):
    """List of query history entries."""
    history: List[QueryHistoryItem]
    total: int


# ── Authentication Models ──────────────────────────────────────

class UserSignupRequest(BaseModel):
    """Signup payload."""
    full_name: str = Field(..., min_length=1)
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)
    role: str = Field(..., description="Role of the user (Student, Developer, Data Analyst, Admin, Business User)")


class UserLoginRequest(BaseModel):
    """Login payload."""
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)


class UserResponse(BaseModel):
    """Public user metadata."""
    id: int
    full_name: str
    email: str
    role: str
    created_at: datetime


class TokenResponse(BaseModel):
    """JWT Token response."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
