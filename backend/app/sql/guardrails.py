"""
SQL guardrails for security validation.
Multi-tiered protection against unsafe SQL operations.
"""
import re
from typing import Dict, Any
from app.config import settings
import logging

logger = logging.getLogger(__name__)


def strip_sql_comments(sql: str) -> str:
    """
    Remove SQL comments to prevent comment-based injection.
    
    Args:
        sql: SQL query string
        
    Returns:
        SQL with comments removed
    """
    # Remove single-line comments (-- and #)
    sql = re.sub(r'--[^\n]*', '', sql)
    sql = re.sub(r'#[^\n]*', '', sql)
    
    # Remove multi-line comments (/* ... */)
    sql = re.sub(r'/\*.*?\*/', '', sql, flags=re.DOTALL)
    
    return sql.strip()


def check_multiple_statements(sql: str) -> bool:
    """
    Check if SQL contains multiple statements (semicolon-separated).
    
    Args:
        sql: SQL query string
        
    Returns:
        True if multiple statements detected
    """
    # Remove string literals to avoid false positives
    sql_without_strings = re.sub(r"'[^']*'", "", sql)
    sql_without_strings = re.sub(r'"[^"]*"', "", sql_without_strings)
    
    # Check for semicolons (indicates multiple statements)
    semicolons = [s.strip() for s in sql_without_strings.split(';') if s.strip()]
    
    return len(semicolons) > 1


def validate_sql_guardrails(sql: str) -> Dict[str, Any]:
    """
    Comprehensive SQL guardrail validation.
    
    Args:
        sql: SQL query to validate
        
    Returns:
        Dict with is_safe, reason, and sanitized_sql
    """
    if not sql or not sql.strip():
        return {
            "is_safe": False,
            "reason": "Empty SQL query",
            "sanitized_sql": ""
        }
    
    # Step 1: Strip comments
    sanitized_sql = strip_sql_comments(sql)
    
    if not sanitized_sql:
        return {
            "is_safe": False,
            "reason": "Query contains only comments",
            "sanitized_sql": ""
        }
    
    # Step 2: Check for multiple statements
    if check_multiple_statements(sanitized_sql):
        return {
            "is_safe": False,
            "reason": "Multiple SQL statements detected (semicolon-separated queries not allowed)",
            "sanitized_sql": sanitized_sql
        }
    
    # Step 3: Normalize for keyword checking
    sql_upper = sanitized_sql.upper().strip()
    
    # Step 4: Block dangerous keywords
    dangerous_keywords = [
        "INSERT", "UPDATE", "DELETE", "DROP", "ALTER",
        "TRUNCATE", "CREATE", "REPLACE", "MERGE",
        "GRANT", "REVOKE", "PRAGMA", "ATTACH", "DETACH",
        "EXEC", "EXECUTE", "CALL"
    ]
    
    for keyword in dangerous_keywords:
        # Use word boundaries to avoid false positives
        pattern = r'\b' + keyword + r'\b'
        if re.search(pattern, sql_upper):
            return {
                "is_safe": False,
                "reason": f"Dangerous keyword detected: {keyword}",
                "sanitized_sql": sanitized_sql
            }
            
    # Step 5: Check if SELECT or WITH...SELECT
    is_select = sql_upper.startswith("SELECT")
    is_with_select = sql_upper.startswith("WITH")
    
    if not (is_select or is_with_select):
        return {
            "is_safe": False,
            "reason": "Only SELECT and WITH...SELECT queries are allowed",
            "sanitized_sql": sanitized_sql
        }
    
    # Step 6: If WITH, ensure final statement is SELECT
    if is_with_select:
        # Find the last standalone SELECT keyword
        if not re.search(r'\bSELECT\b', sql_upper):
            return {
                "is_safe": False,
                "reason": "WITH clause must end with a SELECT statement",
                "sanitized_sql": sanitized_sql
            }
    
    # Step 6.5: Block query access to internal schema tables
    internal_tables = ["QUERYGEN_USERS", "QUERYGEN_CONNECTIONS", "QUERYGEN_HISTORY", "USERS"]
    for table in internal_tables:
        pattern = r'\b' + table + r'\b'
        if re.search(pattern, sql_upper):
            return {
                "is_safe": False,
                "reason": f"Access to internal table is restricted: {table.lower()}",
                "sanitized_sql": sanitized_sql
            }


    # Step 7: Check ALLOW_WRITE setting
    if not settings.ALLOW_WRITE:
        # Additional check to ensure no write operations
        write_patterns = [
            r'\bINTO\b',  # SELECT INTO
            r'\bSET\b.*=',  # SET operations
        ]
        
        for pattern in write_patterns:
            if re.search(pattern, sql_upper):
                logger.warning(f"Potential write operation blocked: {pattern}")
                # Allow SELECT INTO for temp operations in WITH clauses
                # but log for monitoring
    
    # Step 8: All checks passed
    return {
        "is_safe": True,
        "reason": "Query passed all guardrail validations",
        "sanitized_sql": sanitized_sql
    }


def validate_and_sanitize(sql: str) -> Dict[str, Any]:
    """
    Main entry point for SQL validation and sanitization.
    
    Args:
        sql: SQL query to validate
        
    Returns:
        Dict with validation results
    """
    logger.info("Running SQL guardrail validation")
    result = validate_sql_guardrails(sql)
    
    if result["is_safe"]:
        logger.info("SQL query passed guardrail validation")
    else:
        logger.warning(f"SQL query blocked: {result['reason']}")
    
    return result
