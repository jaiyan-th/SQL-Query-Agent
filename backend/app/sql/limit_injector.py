"""
SQL LIMIT clause injection for result size control.
"""
import re
from app.config import settings
import logging

logger = logging.getLogger(__name__)


def has_limit_clause(sql: str) -> bool:
    """
    Check if SQL already has a LIMIT clause.
    
    Args:
        sql: SQL query string
        
    Returns:
        True if LIMIT exists
    """
    sql_upper = sql.upper()
    return bool(re.search(r'\bLIMIT\s+\d+', sql_upper))


def is_aggregation_only(sql: str) -> bool:
    """
    Check if query is aggregation-only (COUNT, SUM, etc.) without GROUP BY.
    
    Args:
        sql: SQL query string
        
    Returns:
        True if aggregation-only query
    """
    sql_upper = sql.upper()
    
    # Check for aggregate functions
    has_aggregate = bool(re.search(
        r'\b(COUNT|SUM|AVG|MIN|MAX|TOTAL)\s*\(',
        sql_upper
    ))
    
    # Check if no GROUP BY (aggregation returns single row)
    has_group_by = bool(re.search(r'\bGROUP\s+BY\b', sql_upper))
    
    return has_aggregate and not has_group_by


def inject_limit(sql: str, limit: int = None) -> str:
    """
    Inject LIMIT clause into SQL query if missing.
    
    Args:
        sql: SQL query string
        limit: Limit value (defaults to DEFAULT_LIMIT)
        
    Returns:
        SQL with LIMIT clause
    """
    if limit is None:
        limit = settings.DEFAULT_LIMIT
    
    # Enforce MAX_ROWS
    limit = min(limit, settings.MAX_ROWS)
    
    # Skip if already has LIMIT
    if has_limit_clause(sql):
        logger.info("SQL already has LIMIT clause")
        return sql
    
    # Skip if aggregation-only query
    if is_aggregation_only(sql):
        logger.info("Skipping LIMIT for aggregation-only query")
        return sql
    
    # Remove trailing semicolon if present
    sql = sql.rstrip(';').strip()
    
    # Add LIMIT clause
    sql_with_limit = f"{sql} LIMIT {limit}"
    
    logger.info(f"Injected LIMIT {limit} into query")
    return sql_with_limit


def enforce_max_rows(sql: str) -> str:
    """
    Ensure LIMIT does not exceed MAX_ROWS.
    
    Args:
        sql: SQL query string
        
    Returns:
        SQL with enforced max rows limit
    """
    if not has_limit_clause(sql):
        return sql
    
    # Extract current LIMIT value
    match = re.search(r'\bLIMIT\s+(\d+)', sql, re.IGNORECASE)
    if match:
        current_limit = int(match.group(1))
        
        if current_limit > settings.MAX_ROWS:
            # Replace with MAX_ROWS
            sql = re.sub(
                r'\bLIMIT\s+\d+',
                f'LIMIT {settings.MAX_ROWS}',
                sql,
                flags=re.IGNORECASE
            )
            logger.warning(f"Reduced LIMIT from {current_limit} to {settings.MAX_ROWS}")
    
    return sql


def process_sql_limits(sql: str) -> str:
    """
    Main entry point for LIMIT processing.
    
    Args:
        sql: SQL query string
        
    Returns:
        SQL with appropriate LIMIT clause
    """
    # First inject LIMIT if missing
    sql = inject_limit(sql)
    
    # Then enforce MAX_ROWS
    sql = enforce_max_rows(sql)
    
    return sql
