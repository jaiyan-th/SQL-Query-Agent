"""
Core SQL generation pipeline shared by Function 1 and Function 2.
"""
from typing import Dict, Any

from app.rag.retriever import retrieve_schema_context
from app.llm.client import get_llm_client
from app.llm.prompts import build_sql_generation_prompt
from app.sql.guardrails import validate_and_sanitize
import logging

logger = logging.getLogger(__name__)


def generate_sql_core(
    user_id: int,
    workspace_id: str,
    database_type: str,
    question: str,
) -> Dict[str, Any]:
    """
    Shared SQL generation pipeline:
    1. Retrieve SQLite schema context from Qdrant.
    2. Build SQLite-specific LLM prompt.
    3. Call Groq / Gemini LLM.
    4. Validate generated SQL through guardrails.
    5. Return result dict.
    """
    logger.info(
        f"SQL generation: user_id={user_id}, workspace_id={workspace_id}, dialect={database_type}"
    )

    retrieval = retrieve_schema_context(
        question=question,
        user_id=user_id,
        workspace_id=workspace_id,
        top_k=3,
    )
    schema_contexts = retrieval["schema_contexts"]
    context_text = retrieval["context_text"]

    if not schema_contexts:
        raise ValueError(
            "No schema context found. Please extract and index your SQLite schema first."
        )

    prompt = build_sql_generation_prompt(
        question=question,
        schema_context=context_text,
        database_type=database_type,
    )

    llm_client = get_llm_client()
    llm_response = llm_client.generate_sql(prompt)

    safety_check = validate_and_sanitize(llm_response.sql)

    return {
        "sql": llm_response.sql,
        "explanation": llm_response.explanation,
        "tables_used": llm_response.tables_used,
        "confidence": llm_response.confidence,
        "needs_clarification": llm_response.needs_clarification,
        "clarification_question": llm_response.clarification_question,
        "is_safe": safety_check["is_safe"],
        "safety_reason": safety_check.get("reason"),
        "schema_context": schema_contexts,
        "rag_context_used": True,
    }
