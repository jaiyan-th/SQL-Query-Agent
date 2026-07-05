from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.schemas import GenerateQueryResponse
from app.services.sql_generation_service import generate_sql_core
from app.db.history import add_history_entry
import logging

logger = logging.getLogger(__name__)

def generate_query(
    db: Session,
    user_id: int,
    connection_id: int,
    database_type: str,
    question: str
) -> GenerateQueryResponse:
    """
    Function 1: Generate SQL query using retrieved RAG context and target dialect.
    Calls shared SQL generation core and returns GenerateQueryResponse.
    """
    logger.info(f"Generating query (user_id={user_id}, connection_id={connection_id}) for: {question}")
    
    try:
        # Call core shared generation pipeline
        res = generate_sql_core(
            user_id=user_id,
            connection_id=connection_id,
            database_type=database_type,
            question=question
        )
        
        # Log transaction audit to platform Neon history
        add_history_entry(
            db=db,
            user_id=user_id,
            connection_id=connection_id,
            question=question,
            generated_sql=res["sql"],
            mode="generate",
            output_format="table",
            status="success" if res["is_safe"] else "blocked",
            error_message=None if res["is_safe"] else res["safety_reason"]
        )
        
        return GenerateQueryResponse(
            mode="generate_only",
            question=question,
            generated_sql=res["sql"],
            explanation=res["explanation"] if res["is_safe"] else res["safety_reason"],
            tables_used=res["tables_used"],
            confidence=res["confidence"],
            rag_context_used=res["rag_context_used"],
            guardrail_status="passed" if res["is_safe"] else "failed",
            safety_status="safe" if res["is_safe"] else "blocked",
            executed=False,
            schema_context=res["schema_context"]
        )
    except Exception as e:
        logger.error(f"SQL generation pipeline failure: {str(e)}")
        # Log failure to history
        add_history_entry(
            db=db,
            user_id=user_id,
            connection_id=connection_id,
            question=question,
            generated_sql="",
            mode="generate",
            output_format="table",
            status="failed",
            error_message=str(e)
        )
        raise e
