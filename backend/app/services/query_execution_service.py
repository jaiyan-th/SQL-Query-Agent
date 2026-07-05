"""
Function 2 service: generate SQL and execute it on the SQLite file.
"""
import time
import logging
from typing import Dict, Any, List

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

logger = logging.getLogger(__name__)


def _self_correct(
    question: str,
    failed_sql: str,
    error_message: str,
    schema_contexts: list,
    database_type: str,
    attempt: int,
) -> Dict[str, Any]:
    logger.info(f"Self-correction attempt {attempt}")
    try:
        prompt = build_sql_generation_prompt(
            question=question,
            schema_context=format_schema_context_for_prompt(schema_contexts),
            database_type=database_type,
            previous_sql=failed_sql,
            error_message=error_message,
        )
        resp = get_llm_client().generate_sql(prompt)
        return {"success": True, "sql": resp.sql, "explanation": resp.explanation}
    except Exception as e:
        return {"success": False, "error": str(e)}


def generate_and_execute(
    db: Session,
    user_id: int,
    workspace_id: str,
    database_type: str,
    engine: Engine,
    question: str,
) -> GenerateAndRunResponse:
    """
    Function 2: Generate SQL → guardrail check → inject LIMIT →
    execute on SQLite engine → return result rows.
    """
    logger.info(f"generate_and_execute: user={user_id}, workspace={workspace_id}")

    try:
        res = generate_sql_core(
            user_id=user_id,
            workspace_id=workspace_id,
            database_type=database_type,
            question=question,
        )

        if not res["is_safe"]:
            add_history_entry(
                db=db, user_id=user_id, workspace_id=workspace_id,
                question=question, generated_sql=res["sql"],
                mode="execute", status="blocked",
                error_message=res["safety_reason"],
            )
            return GenerateAndRunResponse(
                mode="generate_and_execute", question=question,
                generated_sql=res["sql"],
                explanation=res["safety_reason"] or "Blocked by guardrails",
                columns=[], rows=[], row_count=0, execution_time_ms=0.0,
                rag_context_used=res["rag_context_used"],
                guardrail_status="failed", safety_status="blocked",
                executed=True, schema_context=res["schema_context"],
            )

        current_sql = process_sql_limits(res["sql"])
        current_explanation = res["explanation"]
        last_error = None
        max_attempts = settings.MAX_RETRY_ATTEMPTS + 1

        for attempt in range(1, max_attempts + 1):
            try:
                t0 = time.time()
                exec_result = execute_query(engine, current_sql)
                exec_ms = round((time.time() - t0) * 1000, 2)

                columns = exec_result["columns"]
                rows_dict = [dict(zip(columns, row)) for row in exec_result["rows"]]

                add_history_entry(
                    db=db, user_id=user_id, workspace_id=workspace_id,
                    question=question, generated_sql=current_sql,
                    mode="execute", status="success",
                    row_count=exec_result["row_count"],
                    execution_time_ms=int(exec_ms),
                )

                return GenerateAndRunResponse(
                    mode="generate_and_execute", question=question,
                    generated_sql=current_sql, explanation=current_explanation,
                    columns=columns, rows=rows_dict,
                    row_count=exec_result["row_count"], execution_time_ms=exec_ms,
                    rag_context_used=res["rag_context_used"],
                    guardrail_status="passed", safety_status="safe",
                    executed=True, schema_context=res["schema_context"],
                )

            except Exception as e:
                last_error = str(e)
                logger.warning(f"Execution attempt {attempt} failed: {last_error}")

                if attempt < max_attempts:
                    fix = _self_correct(
                        question=question, failed_sql=current_sql,
                        error_message=last_error,
                        schema_contexts=res["schema_context"],
                        database_type=database_type, attempt=attempt,
                    )
                    if fix["success"]:
                        check = validate_and_sanitize(fix["sql"])
                        if check["is_safe"]:
                            current_sql = process_sql_limits(check["sanitized_sql"])
                            current_explanation = fix["explanation"]
                            continue
                break

        add_history_entry(
            db=db, user_id=user_id, workspace_id=workspace_id,
            question=question, generated_sql=current_sql,
            mode="execute", status="error", error_message=last_error,
        )

        return GenerateAndRunResponse(
            mode="generate_and_execute", question=question,
            generated_sql=current_sql, explanation=current_explanation,
            columns=[], rows=[], row_count=0, execution_time_ms=0.0,
            rag_context_used=res["rag_context_used"],
            guardrail_status="failed", safety_status="safe",
            executed=True, schema_context=res["schema_context"],
        )

    except Exception as e:
        logger.error(f"generate_and_execute outer error: {str(e)}")
        add_history_entry(
            db=db, user_id=user_id, workspace_id=workspace_id,
            question=question, generated_sql="",
            mode="execute", status="failed", error_message=str(e),
        )
        raise e
