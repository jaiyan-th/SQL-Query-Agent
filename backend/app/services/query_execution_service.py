import time
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.engine import Engine
from app.schemas import GenerateAndRunResponse, SchemaContext
from app.services.query_generation_service import generate_query
from app.services.output_format_service import detect_and_clean_format
from app.services.chart_builder import build_chart_config
from app.services.result_formatter import format_result
from app.sql.guardrails import validate_and_sanitize
from app.sql.limit_injector import process_sql_limits
from app.sql.executor import execute_query
from app.llm.client import get_llm_client
from app.llm.prompts import build_sql_generation_prompt
from app.rag.retriever import format_schema_context_for_prompt
from app.db.history import add_history_entry
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
    question: str,
    request_format: str = "auto"
) -> GenerateAndRunResponse:
    """
    Function 2: Generate SQL via Function 1, validate, inject LIMIT, execute on user database live,
    and format output according to the detected or requested format (table, chart, text, report, analysis).
    """
    logger.info(f"Generate and execute (user_id={user_id}, connection_id={connection_id}) for: {question} (requested format: {request_format})")

    # ── Step 0: Detect output format intent and clean question ──
    cleaned_question, output_format = detect_and_clean_format(question, request_format)
    logger.info(f"Cleaned question: '{cleaned_question}' | Detected format: '{output_format}'")

    try:
        # ── Step 1: Call Function 1 to generate SQL ──────────────
        gen_response = generate_query(
            db=db,
            user_id=user_id,
            connection_id=connection_id,
            database_type=database_type,
            question=cleaned_question
        )

        if gen_response.status != "success":
            query_id = add_history_entry(
                db=db,
                user_id=user_id,
                connection_id=connection_id,
                question=question,
                generated_sql="",
                mode="execute",
                output_format=output_format,
                status="failed",
                error_message="SQL generation failed"
            )
            return GenerateAndRunResponse(
                status="error",
                sql="",
                explanation=gen_response.explanation,
                columns=[],
                rows=[],
                row_count=0,
                execution_status="failed",
                execution_time_ms=None,
                output_format=output_format,
                chart_config=None,
                text_response="",
                report="",
                analysis="",
                guardrail_report={},
                schema_context=gen_response.schema_context,
                safety_status="error",
                error_message="SQL generation failed",
                query_id=query_id
            )

        if gen_response.safety_status != "safe":
            query_id = add_history_entry(
                db=db,
                user_id=user_id,
                connection_id=connection_id,
                question=question,
                generated_sql=gen_response.sql,
                mode="execute",
                output_format=output_format,
                status="blocked",
                error_message="Generated SQL failed safety check"
            )
            return GenerateAndRunResponse(
                status="error",
                sql=gen_response.sql,
                explanation=gen_response.explanation,
                columns=[],
                rows=[],
                row_count=0,
                execution_status="blocked",
                execution_time_ms=None,
                output_format=output_format,
                chart_config=None,
                text_response="",
                report="",
                analysis="",
                guardrail_report={"is_safe": False, "reason": "Generated SQL failed safety check"},
                schema_context=gen_response.schema_context,
                safety_status="unsafe",
                error_message="Generated SQL failed initial safety check. Only SELECT queries are allowed.",
                query_id=query_id
            )

        current_sql = gen_response.sql
        current_explanation = gen_response.explanation

        # ── Step 2: Comprehensive guardrail validation ────────────
        validation = validate_and_sanitize(current_sql)
        guardrail_report = {
            "is_safe": validation["is_safe"],
            "reason": validation.get("reason")
        }

        if not validation["is_safe"]:
            query_id = add_history_entry(
                db=db,
                user_id=user_id,
                connection_id=connection_id,
                question=question,
                generated_sql=current_sql,
                mode="execute",
                output_format=output_format,
                status="blocked",
                error_message=validation["reason"]
            )
            return GenerateAndRunResponse(
                status="error",
                sql=current_sql,
                explanation=current_explanation,
                columns=[],
                rows=[],
                row_count=0,
                execution_status="blocked",
                execution_time_ms=None,
                output_format=output_format,
                chart_config=None,
                text_response="",
                report="",
                analysis="",
                guardrail_report=guardrail_report,
                schema_context=gen_response.schema_context,
                safety_status="unsafe",
                error_message=f"SQL blocked by guardrails: {validation['reason']}",
                query_id=query_id
            )

        # ── Step 3: Inject LIMIT ──────────────────────────────────
        safe_sql = process_sql_limits(validation["sanitized_sql"])

        # ── Step 4: Execute with self-correction loop ─────────────
        max_attempts = settings.MAX_RETRY_ATTEMPTS + 1
        last_error = None

        for attempt in range(1, max_attempts + 1):
            try:
                logger.info(f"Execution attempt {attempt} on user database engine")

                exec_start = time.time()
                result = execute_query(engine, safe_sql)
                exec_time_ms = round((time.time() - exec_start) * 1000, 2)

                columns = result["columns"]
                rows = result["rows"]
                row_count = result["row_count"]

                # ── Step 5: Format Output ─────────────────────────
                chart_config = None
                text_response = ""
                report = ""
                analysis = ""
                
                # Build specific outputs based on output_format
                if output_format in ["bar_chart", "pie_chart"]:
                    output_format, chart_config, fallback_msg = build_chart_config(
                        columns, rows, output_format
                    )
                    if fallback_msg:
                        text_response = fallback_msg
                
                if output_format == "text":
                    text_response = format_result(cleaned_question, safe_sql, columns, rows, "text")
                elif output_format == "report":
                    report = format_result(cleaned_question, safe_sql, columns, rows, "report")
                elif output_format == "analysis":
                    analysis = format_result(cleaned_question, safe_sql, columns, rows, "analysis")
                
                # Populate default fallback text/report/analysis silently for rich UX
                if not text_response and output_format != "bar_chart" and output_format != "pie_chart":
                    text_response = build_deterministic_text(cleaned_question, columns, rows)
                if not report:
                    report = build_deterministic_report(cleaned_question, safe_sql, columns, rows)
                if not analysis:
                    analysis = build_deterministic_analysis(cleaned_question, columns, rows)

                query_id = add_history_entry(
                    db=db,
                    user_id=user_id,
                    connection_id=connection_id,
                    question=question,
                    generated_sql=safe_sql,
                    mode="execute",
                    output_format=output_format,
                    status="success",
                    row_count=row_count,
                    execution_time_ms=int(exec_time_ms)
                )

                return GenerateAndRunResponse(
                    status="success",
                    sql=safe_sql,
                    explanation=current_explanation,
                    columns=columns,
                    rows=rows,
                    row_count=row_count,
                    execution_status="executed",
                    execution_time_ms=exec_time_ms,
                    output_format=output_format,
                    chart_config=chart_config,
                    text_response=text_response,
                    report=report,
                    analysis=analysis,
                    guardrail_report=guardrail_report,
                    schema_context=gen_response.schema_context,
                    safety_status="safe",
                    query_id=query_id
                )

            except Exception as e:
                last_error = str(e)
                logger.warning(f"Attempt {attempt} failed: {last_error}")

                if attempt < max_attempts:
                    correction = self_correct_and_retry(
                        question=cleaned_question,
                        failed_sql=safe_sql,
                        error_message=last_error,
                        schema_contexts=gen_response.schema_context,
                        database_type=database_type,
                        attempt=attempt
                    )

                    if correction["success"]:
                        corrected_sql = correction["sql"]
                        correction_validation = validate_and_sanitize(corrected_sql)

                        if correction_validation["is_safe"]:
                            safe_sql = process_sql_limits(correction_validation["sanitized_sql"])
                            current_explanation = correction["explanation"]
                            logger.info("Using self-corrected SQL for next attempt")
                        else:
                            logger.warning("Corrected SQL failed validation — stopping retries")
                            break
                    else:
                        logger.warning("Self-correction failed — stopping retries")
                        break

        # ── All attempts exhausted ────────────────────────────────
        query_id = add_history_entry(
            db=db,
            user_id=user_id,
            connection_id=connection_id,
            question=question,
            generated_sql=safe_sql,
            mode="execute",
            output_format=output_format,
            status="error",
            error_message=last_error
        )

        return GenerateAndRunResponse(
            status="error",
            sql=safe_sql,
            explanation=current_explanation,
            columns=[],
            rows=[],
            row_count=0,
            execution_status="failed",
            execution_time_ms=None,
            output_format=output_format,
            chart_config=None,
            text_response="",
            report="",
            analysis="",
            guardrail_report=guardrail_report,
            schema_context=gen_response.schema_context,
            safety_status="safe",
            error_message=f"Query execution failed after {max_attempts} attempt(s): {last_error}",
            query_id=query_id
        )

    except Exception as e:
        logger.error(f"Generate and execute failed: {str(e)}")
        return GenerateAndRunResponse(
            status="error",
            sql="",
            explanation=f"Unexpected error: {str(e)}",
            columns=[],
            rows=[],
            row_count=0,
            execution_status="error",
            execution_time_ms=None,
            output_format=request_format,
            chart_config=None,
            text_response="",
            report="",
            analysis="",
            guardrail_report={},
            schema_context=[],
            safety_status="error",
            error_message=str(e)
        )

def build_deterministic_text(question: str, columns: List[str], rows: List[List[Any]]) -> str:
    """Helper fallback to build quick summaries without circular imports."""
    from app.services.result_formatter import build_deterministic_text as f_text
    return f_text(question, columns, rows)

def build_deterministic_report(question: str, sql: str, columns: List[str], rows: List[List[Any]]) -> str:
    """Helper fallback to build reports without circular imports."""
    from app.services.result_formatter import build_deterministic_report as f_report
    return f_report(question, sql, columns, rows)

def build_deterministic_analysis(question: str, columns: List[str], rows: List[List[Any]]) -> str:
    """Helper fallback to build analysis without circular imports."""
    from app.services.result_formatter import build_deterministic_analysis as f_analysis
    return f_analysis(question, columns, rows)
