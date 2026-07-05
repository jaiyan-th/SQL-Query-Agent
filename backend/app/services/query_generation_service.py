"""
Service for Function 1: Query Generation Mode.
Generates SQL without execution.
"""
from typing import Dict, Any
from app.schemas import GenerateQueryResponse, SchemaContext
from app.rag.retriever import retrieve_schema_context
from app.llm.client import get_llm_client
from app.llm.prompts import build_sql_generation_prompt
from app.db.history import add_history_entry
import logging

logger = logging.getLogger(__name__)


def validate_sql_safety_basic(sql: str) -> Dict[str, Any]:
    """
    Basic safety validation without execution.
    
    Args:
        sql: SQL query to validate
        
    Returns:
        Dict with is_safe, reason, and sanitized_sql
    """
    sql_upper = sql.upper().strip()
    
    # Check for dangerous keywords
    dangerous_keywords = [
        "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", 
        "TRUNCATE", "CREATE", "REPLACE", "MERGE", 
        "GRANT", "REVOKE", "PRAGMA", "ATTACH", "DETACH",
        "EXEC", "EXECUTE", "CALL"
    ]
    
    for keyword in dangerous_keywords:
        if f" {keyword} " in f" {sql_upper} " or sql_upper.startswith(f"{keyword} "):
            return {
                "is_safe": False,
                "reason": f"Dangerous keyword detected: {keyword}",
                "sanitized_sql": sql
            }
    
    # Check if it's a SELECT or WITH...SELECT
    if not (sql_upper.startswith("SELECT") or sql_upper.startswith("WITH")):
        return {
            "is_safe": False,
            "reason": "Query must start with SELECT or WITH",
            "sanitized_sql": sql
        }
    
    return {
        "is_safe": True,
        "reason": "Query passes basic safety checks",
        "sanitized_sql": sql
    }


def generate_query(question: str) -> GenerateQueryResponse:
    """
    Function 1: Generate SQL query without execution.
    
    Args:
        question: Natural language question
        
    Returns:
        GenerateQueryResponse with SQL and metadata
    """
    logger.info(f"Generating query for: {question}")
    
    try:
        # Step 1: Retrieve schema context from RAG
        retrieval_result = retrieve_schema_context(question, top_k=3)
        schema_contexts = retrieval_result["schema_contexts"]
        
        if not schema_contexts:
            return GenerateQueryResponse(
                status="error",
                sql="",
                explanation="No relevant schema found. Please ingest schema first.",
                tables_used=[],
                confidence=0.0,
                safety_status="error",
                schema_context=[],
                needs_clarification=True,
                clarification_question="Could not find relevant database schema. Has the schema been ingested?"
            )
        
        # Step 2: Build prompt with schema context
        schema_context_str = retrieval_result["context_text"]
        prompt = build_sql_generation_prompt(question, schema_context_str)
        
        # Step 3: Generate SQL using LLM
        llm_client = get_llm_client()
        llm_response = llm_client.generate_sql(prompt)
        
        # Step 4: Validate safety (basic check, no execution)
        safety_check = validate_sql_safety_basic(llm_response.sql)
        
        # Step 5: Log to history
        add_history_entry(
            question=question,
            generated_sql=llm_response.sql,
            mode="generate",
            status="success" if safety_check["is_safe"] else "unsafe"
        )
        
        # Step 6: Return response
        return GenerateQueryResponse(
            status="success",
            sql=llm_response.sql,
            explanation=llm_response.explanation,
            tables_used=llm_response.tables_used,
            confidence=llm_response.confidence,
            safety_status="safe" if safety_check["is_safe"] else "unsafe",
            schema_context=schema_contexts,
            needs_clarification=llm_response.needs_clarification,
            clarification_question=llm_response.clarification_question
        )
    
    except Exception as e:
        logger.error(f"Query generation failed: {str(e)}")
        
        # Log error to history
        add_history_entry(
            question=question,
            generated_sql="",
            mode="generate",
            status="error",
            error_message=str(e)
        )
        
        return GenerateQueryResponse(
            status="error",
            sql="",
            explanation=f"Failed to generate query: {str(e)}",
            tables_used=[],
            confidence=0.0,
            safety_status="error",
            schema_context=[]
        )
