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
    output_format: Optional[str] = Field("auto", description="Desired output format (table, bar_chart, pie_chart, text, report, analysis, auto)")


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
    status: str
    sql: str
    explanation: str
    tables_used: List[str]
    confidence: float
    safety_status: str
    schema_context: List[SchemaContext]
    needs_clarification: bool = False
    clarification_question: Optional[str] = None


class GenerateAndRunResponse(BaseModel):
    """Response for Function 2: Generate SQL and Execute on PostgreSQL with formatting."""
    status: str
    sql: str
    explanation: str
    columns: List[str]
    rows: List[List[Any]]
    row_count: int
    execution_status: str
    execution_time_ms: Optional[float] = None   # Query execution time in milliseconds
    output_format: str = "table"
    chart_config: Optional[Dict[str, Any]] = None
    text_response: str = ""
    report: str = ""
    analysis: str = ""
    guardrail_report: Dict[str, Any] = {}
    schema_context: List[SchemaContext]
    safety_status: str
    error_message: Optional[str] = None
    query_id: Optional[int] = None


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
    """Payload to test connection configuration."""
    database_type: str
    database_url: str


class ConnectionTestResponse(BaseModel):
    """Response returned for database connection tests."""
    connected: bool
    database_type: str
    provider: str
    masked_url: str
    host: str
    database_name: str
    read_only_mode: bool = True


class ConnectionSaveRequest(BaseModel):
    """Payload to save database connection credentials."""
    connection_name: str
    database_type: str
    database_url: str


class ConnectionSaveResponse(BaseModel):
    """Response returned after connection properties are encrypted and saved."""
    saved: bool
    connection_id: int
    database_type: str
    masked_url: str
    host: str
    database_name: str


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
