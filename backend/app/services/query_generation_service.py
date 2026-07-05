from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.schemas import GenerateQueryResponse, SchemaContext
from app.rag.retriever import retrieve_schema_context
from app.llm.client import get_llm_client
from app.llm.prompts import build_sql_generation_prompt
from app.db.history import add_history_entry
from app.sql.guardrails import validate_and_sanitize
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
    """
    logger.info(f"Generating query (user_id={user_id}, connection_id={connection_id}, type={database_type}) for: {question}")
    
    try:
        # 1. Retrieve schema context from Qdrant RAG
        retrieval_result = retrieve_schema_context(
            question=question,
            user_id=user_id,
            connection_id=connection_id,
            top_k=3
        )
        schema_contexts = retrieval_result["schema_contexts"]
        
        if not schema_contexts:
            # Re-generate or return error if schemas are empty
            err_msg = "No schema context is indexed for this database connection. Please sync schema first."
            add_history_entry(
                db=db,
                user_id=user_id,
                connection_id=connection_id,
                question=question,
                generated_sql="",
                mode="generate",
                output_format="table",
                status="blocked",
                error_message=err_msg
            )
            return GenerateQueryResponse(
                status="error",
                sql="",
                explanation=err_msg,
                tables_used=[],
                confidence=0.0,
                safety_status="blocked",
                schema_context=[],
                needs_clarification=True,
                clarification_question=err_msg
            )
        
        # 2. Build LLM prompt containing dialect info and schema context
        schema_context_str = retrieval_result["context_text"]
        prompt = build_sql_generation_prompt(
            question=question,
            schema_context=schema_context_str,
            database_type=database_type
        )
        
        # 3. Request LLM SQL generation
        llm_client = get_llm_client()
        llm_response = llm_client.generate_sql(prompt)
        
        # 4. Enforce strict SQL guardrails validation
        safety_check = validate_and_sanitize(llm_response.sql)
        
        # 5. Log transaction audit to platform Neon history
        add_history_entry(
            db=db,
            user_id=user_id,
            connection_id=connection_id,
            question=question,
            generated_sql=llm_response.sql,
            mode="generate",
            output_format="table",
            status="success" if safety_check["is_safe"] else "blocked",
            error_message=None if safety_check["is_safe"] else safety_check["reason"]
        )
        
        return GenerateQueryResponse(
            status="success" if safety_check["is_safe"] else "blocked",
            sql=llm_response.sql,
            explanation=llm_response.explanation if safety_check["is_safe"] else safety_check["reason"],
            tables_used=llm_response.tables_used,
            confidence=llm_response.confidence,
            safety_status="safe" if safety_check["is_safe"] else "blocked",
            schema_context=schema_contexts,
            needs_clarification=llm_response.needs_clarification,
            clarification_question=llm_response.clarification_question
        )
    
    except Exception as e:
        logger.error(f"Query generation pipeline failure: {str(e)}")
        
        # Log failure to history
        try:
            add_history_entry(
                db=db,
                user_id=user_id,
                connection_id=connection_id,
                question=question,
                generated_sql="",
                mode="generate",
                output_format="table",
                status="error",
                error_message=str(e)
            )
        except Exception:
            pass
            
        return GenerateQueryResponse(
            status="error",
            sql="",
            explanation=f"Query generation failed: {str(e)}",
            tables_used=[],
            confidence=0.0,
            safety_status="error",
            schema_context=[]
        )
