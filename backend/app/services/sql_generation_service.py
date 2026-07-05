from typing import Dict, Any, Optional
from app.rag.retriever import retrieve_schema_context
from app.llm.client import get_llm_client
from app.llm.prompts import build_sql_generation_prompt
from app.sql.guardrails import validate_and_sanitize
import logging

logger = logging.getLogger(__name__)

def generate_sql_core(
    user_id: int,
    connection_id: int,
    database_type: str,
    question: str
) -> Dict[str, Any]:
    """
    Shared SQL Generation Pipeline:
    1. Retrieve schema context from Qdrant using RAG.
    2. Build the LLM prompt.
    3. Call Groq primary LLM (Gemini fallback automatically handled by client).
    4. Parse strict JSON response.
    5. Validate generated SQL.
    6. Return generated SQL metadata.
    """
    logger.info(f"Running core SQL generation pipeline for user {user_id}, connection {connection_id} ({database_type})")
    
    # 1. Retrieve schema context from Qdrant RAG
    retrieval_result = retrieve_schema_context(
        question=question,
        user_id=user_id,
        connection_id=connection_id,
        top_k=3
    )
    schema_contexts = retrieval_result["schema_contexts"]
    context_text = retrieval_result["context_text"]
    
    if not schema_contexts:
        raise ValueError("No schema context is indexed for this database connection. Please sync schema first.")
        
    # 2. Build the LLM prompt
    prompt = build_sql_generation_prompt(
        question=question,
        schema_context=context_text,
        database_type=database_type
    )
    
    # 3. Call LLM (failover is built into LLMClient)
    llm_client = get_llm_client()
    llm_response = llm_client.generate_sql(prompt)
    
    # 4. Validate generated SQL via guardrails
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
        "rag_context_used": True
    }
