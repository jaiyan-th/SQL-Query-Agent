"""
Pydantic models for API request/response validation.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime


# ── Query request ─────────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1)


# ── LLM / RAG schemas ─────────────────────────────────────────────────────────

class LLMResponse(BaseModel):
    sql: str
    explanation: str
    tables_used: List[str]
    confidence: float = Field(..., ge=0, le=1)
    needs_clarification: bool = False
    clarification_question: Optional[str] = None


class SchemaContext(BaseModel):
    table_name: str
    content: str
    relevance_score: float


# ── Query response schemas ────────────────────────────────────────────────────

class GenerateQueryResponse(BaseModel):
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


# ── History ───────────────────────────────────────────────────────────────────

class QueryHistoryItem(BaseModel):
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
    database_type: Optional[str] = "sqlite"
    connection_name: Optional[str] = None


class QueryHistoryResponse(BaseModel):
    history: List[QueryHistoryItem]
    total: int


# ── Authentication ────────────────────────────────────────────────────────────

class UserSignupRequest(BaseModel):
    full_name: str = Field(..., min_length=1)
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)
    role: str


class UserLoginRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
