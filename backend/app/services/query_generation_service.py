"""
Function 1 service: generate SQL without execution.
"""
import logging
from typing import Dict, Any

from sqlalchemy.orm import Session

from app.schemas import GenerateQueryResponse
from app.services.sql_generation_service import generate_sql_core
from app.db.history import add_history_entry

logger = logging.getLogger(__name__)


def generate_query(
    db: Session,
    user_id: int,
    workspace_id: str,
    database_type: str,
    question: str,
) -> GenerateQueryResponse:
    """
    Function 1: Generate SQL using RAG + LLM. Record in history. Return response.
    """
    logger.info(f"generate_query: user={user_id}, workspace={workspace_id}")

    try:
        res = generate_sql_core(
            user_id=user_id,
            workspace_id=workspace_id,
            database_type=database_type,
            question=question,
        )

        add_history_entry(
            db=db,
            user_id=user_id,
            workspace_id=workspace_id,
            question=question,
            generated_sql=res["sql"],
            mode="generate",
            status="success" if res["is_safe"] else "blocked",
            error_message=None if res["is_safe"] else res["safety_reason"],
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
            schema_context=res["schema_context"],
        )

    except Exception as e:
        logger.error(f"generate_query failed: {str(e)}")
        add_history_entry(
            db=db,
            user_id=user_id,
            workspace_id=workspace_id,
            question=question,
            generated_sql="",
            mode="generate",
            status="failed",
            error_message=str(e),
        )
        raise e
