"""
Safe SQL query execution with result serialization.
"""
from sqlalchemy import text
from sqlalchemy.engine import Result
from typing import List, Dict, Any, Tuple
from decimal import Decimal
from datetime import datetime, date
from uuid import UUID
from app.db.connection import get_engine
from app.config import settings
import logging

logger = logging.getLogger(__name__)


def serialize_value(value: Any) -> Any:
    """
    Convert non-JSON-serializable values to JSON-safe types.
    
    Args:
        value: Value to serialize
        
    Returns:
        JSON-safe value
    """
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


def execute_query(sql: str) -> Dict[str, Any]:
    """
    Execute SQL query and return results.
    
    Args:
        sql: Validated and sanitized SQL query
        
    Returns:
        Dict with columns, rows, and row_count
        
    Raises:
        Exception: If execution fails
    """
    logger.info(f"Executing query: {sql[:100]}...")
    
    try:
        engine = get_engine()
        
        with engine.connect() as connection:
            # Set timeout if supported (PostgreSQL)
            if "postgres" in str(engine.url):
                try:
                    connection.execute(
                        text(f"SET statement_timeout = {settings.QUERY_TIMEOUT_SECONDS * 1000}")
                    )
                except Exception:
                    pass  # Timeout setting may not be supported
            
            # Execute query
            result: Result = connection.execute(text(sql))
            
            # Get column names
            columns = list(result.keys())
            
            # Fetch rows
            raw_rows = result.fetchall()
            
            # Serialize rows
            rows = []
            for row in raw_rows:
                serialized_row = [serialize_value(value) for value in row]
                rows.append(serialized_row)
            
            row_count = len(rows)
            
            logger.info(f"Query executed successfully: {row_count} rows returned")
            
            return {
                "columns": columns,
                "rows": rows,
                "row_count": row_count,
                "status": "success"
            }
    
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Query execution failed: {error_msg}")
        
        raise Exception(f"Query execution failed: {error_msg}")


def execute_with_retry(
    sql: str,
    max_retries: int = None
) -> Tuple[Dict[str, Any], int]:
    """
    Execute query with retry logic.
    
    Args:
        sql: SQL query to execute
        max_retries: Maximum retry attempts
        
    Returns:
        Tuple of (result dict, attempts_used)
    """
    if max_retries is None:
        max_retries = settings.MAX_RETRY_ATTEMPTS
    
    last_error = None
    
    for attempt in range(1, max_retries + 2):  # +2 because first attempt + retries
        try:
            result = execute_query(sql)
            return result, attempt
        
        except Exception as e:
            last_error = e
            if attempt <= max_retries:
                logger.warning(f"Query attempt {attempt} failed, retrying...")
            else:
                logger.error(f"Query failed after {attempt} attempts")
    
    raise last_error
