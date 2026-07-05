from sqlalchemy import text
from sqlalchemy.engine import Engine, Result
from typing import List, Dict, Any, Tuple
from decimal import Decimal
from datetime import datetime, date
from uuid import UUID
from app.config import settings
import logging

logger = logging.getLogger(__name__)

def serialize_value(value: Any) -> Any:
    """Convert non-JSON-serializable values to JSON-safe types."""
    if value is None:
        return None
    elif isinstance(value, Decimal):
        return float(value)
    elif isinstance(value, (datetime, date)):
        return value.isoformat()
    elif isinstance(value, UUID):
        return str(value)
    elif isinstance(value, bytes):
        return value.decode('utf-8', errors='ignore')
    elif isinstance(value, (int, float, str, bool)):
        return value
    else:
        return str(value)

def execute_query(engine: Engine, sql: str) -> Dict[str, Any]:
    """
    Execute SQL query on the specified user engine and serialize results.
    """
    logger.info(f"Executing query on user engine: {sql[:100]}...")
    
    try:
        with engine.connect() as connection:
            # Apply statement timeouts where supported (PostgreSQL/MySQL)
            db_url_str = str(engine.url).lower()
            if "postgres" in db_url_str:
                try:
                    connection.execute(
                        text(f"SET statement_timeout = {settings.QUERY_TIMEOUT_SECONDS * 1000}")
                    )
                except Exception:
                    pass
            elif "mysql" in db_url_str or "mariadb" in db_url_str:
                try:
                    connection.execute(
                        text(f"SET max_execution_time = {settings.QUERY_TIMEOUT_SECONDS * 1000}")
                    )
                except Exception:
                    pass
            
            result: Result = connection.execute(text(sql))
            
            # Fetch columns and serialize rows
            columns = list(result.keys()) if result.returns_rows else []
            raw_rows = result.fetchall() if result.returns_rows else []
            
            rows = []
            for row in raw_rows:
                rows.append([serialize_value(val) for val in row])
            
            row_count = len(rows)
            logger.info(f"Query execution completed: {row_count} rows fetched.")
            
            return {
                "columns": columns,
                "rows": rows,
                "row_count": row_count,
                "status": "success"
            }
            
    except Exception as e:
        error_msg = str(e)
        logger.error(f"SQL execution error: {error_msg}")
        raise Exception(error_msg)

def execute_with_retry(
    engine: Engine,
    sql: str,
    max_retries: int = None
) -> Tuple[Dict[str, Any], int]:
    """
    Execute query with retry mechanism.
    """
    if max_retries is None:
        max_retries = settings.MAX_RETRY_ATTEMPTS
        
    last_error = None
    for attempt in range(1, max_retries + 2):
        try:
            result = execute_query(engine, sql)
            return result, attempt
        except Exception as e:
            last_error = e
            if attempt <= max_retries:
                logger.warning(f"Query attempt {attempt} failed. Retrying...")
            else:
                logger.error(f"Query execution failed after {attempt} attempts.")
                
    raise last_error
