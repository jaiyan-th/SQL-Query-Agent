import time
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.engine import Engine
from app.schemas import GenerateAndRunResponse
from app.services.sql_generation_service import generate_sql_core
from app.sql.guardrails import validate_and_sanitize
from app.sql.limit_injector import process_sql_limits
from app.sql.executor import execute_query
from app.db.history import add_history_entry
from app.llm.client import get_llm_client
from app.llm.prompts import build_sql_generation_prompt
from app.rag.retriever import format_schema_context_for_prompt
from app.config import settings
import logging

logger = logging.getLogger(__name__)

def self_correct_and_retry(
    question: str,
    failed_sql: str,
    error_message: str,
    schema_contexts: list,
    database_type: str,
    attempt: int
) -> Dict[str, Any]:
    """
    Self-correction loop for failed SQL execution.
    Generates a corrected query based on the execution error.
    """
    logger.info(f"Self-correction attempt {attempt} for dialect {database_type}")

    try:
        schema_context_str = format_schema_context_for_prompt(schema_contexts)
        prompt = build_sql_generation_prompt(
            question=question,
            schema_context=schema_context_str,
            database_type=database_type,
            previous_sql=failed_sql,
            error_message=error_message
        )

        llm_client = get_llm_client()
        llm_response = llm_client.generate_sql(prompt)

        return {
            "success": True,
            "sql": llm_response.sql,
            "explanation": llm_response.explanation
        }

    except Exception as e:
        logger.error(f"Self-correction failed: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

def generate_and_execute(
    db: Session,
    user_id: int,
    connection_id: int,
    database_type: str,
    engine: Engine,
    question: str
) -> GenerateAndRunResponse:
    """
    Function 2: Generate SQL via the shared generation core, validate, execute on user database live,
    and return tabular query results as List[Dict[str, Any]].
    """
    logger.info(f"Generate and execute (user_id={user_id}, connection_id={connection_id}) for: {question}")

    try:
        # 1. Call shared SQL generation pipeline
        res = generate_sql_core(
            user_id=user_id,
            connection_id=connection_id,
            database_type=database_type,
            question=question
        )
        
        if not res["is_safe"]:
            # Log blocked query
            add_history_entry(
                db=db,
                user_id=user_id,
                connection_id=connection_id,
                question=question,
                generated_sql=res["sql"],
                mode="execute",
                output_format="table",
                status="blocked",
                error_message=res["safety_reason"]
            )
            return GenerateAndRunResponse(
                mode="generate_and_execute",
                question=question,
                generated_sql=res["sql"],
                explanation=res["safety_reason"] or "Blocked by guardrails",
                columns=[],
                rows=[],
                row_count=0,
                execution_time_ms=0.0,
                rag_context_used=res["rag_context_used"],
                guardrail_status="failed",
                safety_status="blocked",
                executed=True,
                schema_context=res["schema_context"]
            )
            
        # 2. Inject LIMIT limits
        safe_sql = process_sql_limits(res["sql"])
        
        # 3. Execute query with self-correction loop
        max_attempts = settings.MAX_RETRY_ATTEMPTS + 1
        last_error = None
        current_sql = safe_sql
        current_explanation = res["explanation"]

        for attempt in range(1, max_attempts + 1):
            try:
                logger.info(f"Execution attempt {attempt} on user database engine")
                exec_start = time.time()
                exec_result = execute_query(engine, current_sql)
                exec_time_ms = round((time.time() - exec_start) * 1000, 2)
                
                columns = exec_result["columns"]
                raw_rows = exec_result["rows"]
                row_count = exec_result["row_count"]
                
                # Format rows as List[Dict[str, Any]]
                rows_dict_list = []
                for row in raw_rows:
                    rows_dict_list.append(dict(zip(columns, row)))
                    
                # Log success to history
                add_history_entry(
                    db=db,
                    user_id=user_id,
                    connection_id=connection_id,
                    question=question,
                    generated_sql=current_sql,
                    mode="execute",
                    output_format="table",
                    status="success",
                    row_count=row_count,
                    execution_time_ms=int(exec_time_ms)
                )
                
                return GenerateAndRunResponse(
                    mode="generate_and_execute",
                    question=question,
                    generated_sql=current_sql,
                    explanation=current_explanation,
                    columns=columns,
                    rows=rows_dict_list,
                    row_count=row_count,
                    execution_time_ms=exec_time_ms,
                    rag_context_used=res["rag_context_used"],
                    guardrail_status="passed",
                    safety_status="safe",
                    executed=True,
                    schema_context=res["schema_context"]
                )
            except Exception as e:
                last_error = str(e)
                logger.warning(f"Execution attempt {attempt} failed: {last_error}")
                
                if attempt < max_attempts:
                    # Self correct and retry
                    correction = self_correct_and_retry(
                        question=question,
                        failed_sql=current_sql,
                        error_message=last_error,
                        schema_contexts=res["schema_context"],
                        database_type=database_type,
                        attempt=attempt
                    )
                    if correction["success"]:
                        corrected_sql = correction["sql"]
                        correction_validation = validate_and_sanitize(corrected_sql)
                        if correction_validation["is_safe"]:
                            current_sql = process_sql_limits(correction_validation["sanitized_sql"])
                            current_explanation = correction["explanation"]
                            logger.info("Retrying connection with self-corrected SQL")
                            continue
                break
                
        # If all attempts failed
        add_history_entry(
            db=db,
            user_id=user_id,
            connection_id=connection_id,
            question=question,
            generated_sql=current_sql,
            mode="execute",
            output_format="table",
            status="error",
            error_message=last_error
        )
        
        return GenerateAndRunResponse(
            mode="generate_and_execute",
            question=question,
            generated_sql=current_sql,
            explanation=current_explanation,
            columns=[],
            rows=[],
            row_count=0,
            execution_time_ms=0.0,
            rag_context_used=res["rag_context_used"],
            guardrail_status="failed",
            safety_status="safe",
            executed=True,
            schema_context=res["schema_context"]
        )
    except Exception as e:
        logger.error(f"Generate and execute failed: {str(e)}")
        # Log failure to history
        add_history_entry(
            db=db,
            user_id=user_id,
            connection_id=connection_id,
            question=question,
            generated_sql="",
            mode="execute",
            output_format="table",
            status="failed",
            error_message=str(e)
        )
        raise e
