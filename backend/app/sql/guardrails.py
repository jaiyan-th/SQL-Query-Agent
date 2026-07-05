"""
SQL guardrails for SQLite — block all write and DDL operations,
enforce SELECT-only execution, block internal platform table access.
"""
import re
from typing import Dict, Any
from app.config import settings
import logging

logger = logging.getLogger(__name__)


def strip_sql_comments(sql: str) -> str:
    sql = re.sub(r'--[^\n]*', '', sql)
    sql = re.sub(r'#[^\n]*', '', sql)
    sql = re.sub(r'/\*.*?\*/', '', sql, flags=re.DOTALL)
    return sql.strip()


def check_multiple_statements(sql: str) -> bool:
    sql_no_strings = re.sub(r"'[^']*'", "", sql)
    sql_no_strings = re.sub(r'"[^"]*"', "", sql_no_strings)
    parts = [s.strip() for s in sql_no_strings.split(';') if s.strip()]
    return len(parts) > 1


def validate_sql_guardrails(sql: str) -> Dict[str, Any]:
    if not sql or not sql.strip():
        return {"is_safe": False, "reason": "Empty SQL query", "sanitized_sql": ""}

    sanitized_sql = strip_sql_comments(sql)
    if not sanitized_sql:
        return {"is_safe": False, "reason": "Query contains only comments", "sanitized_sql": ""}

    if check_multiple_statements(sanitized_sql):
        return {
            "is_safe": False,
            "reason": "Multiple SQL statements are not allowed",
            "sanitized_sql": sanitized_sql,
        }

    sql_upper = sanitized_sql.upper().strip()

    # Block all destructive / DDL / SQLite-specific write keywords
    dangerous_keywords = [
        "INSERT", "UPDATE", "DELETE", "DROP", "ALTER",
        "TRUNCATE", "CREATE", "REPLACE", "MERGE",
        "GRANT", "REVOKE",
        # SQLite-specific dangerous operations
        "PRAGMA", "ATTACH", "DETACH", "VACUUM",
        "BEGIN", "COMMIT", "ROLLBACK", "SAVEPOINT", "REINDEX", "ANALYZE",
        "EXEC", "EXECUTE", "CALL",
    ]
    for kw in dangerous_keywords:
        if re.search(r'\b' + kw + r'\b', sql_upper):
            return {
                "is_safe": False,
                "reason": f"Dangerous keyword detected: {kw}",
                "sanitized_sql": sanitized_sql,
            }

    # Must start with SELECT or WITH … SELECT
    is_select = sql_upper.startswith("SELECT")
    is_with = sql_upper.startswith("WITH")
    if not (is_select or is_with):
        return {
            "is_safe": False,
            "reason": "Only SELECT and WITH…SELECT queries are allowed",
            "sanitized_sql": sanitized_sql,
        }

    if is_with and not re.search(r'\bSELECT\b', sql_upper):
        return {
            "is_safe": False,
            "reason": "WITH clause must contain a SELECT statement",
            "sanitized_sql": sanitized_sql,
        }

    # Block access to QueryGen platform tables
    internal_tables = [
        "QUERYGEN_USERS", "QUERYGEN_HISTORY",
        "QUERYGEN_SQLITE_WORKSPACES", "QUERYGEN_CONNECTIONS",
        "USERS", "CONNECTIONS",
    ]
    for tbl in internal_tables:
        if re.search(r'\b' + tbl + r'\b', sql_upper):
            return {
                "is_safe": False,
                "reason": f"Access to internal table is restricted: {tbl.lower()}",
                "sanitized_sql": sanitized_sql,
            }

    # Block SELECT INTO (write to new table)
    if re.search(r'\bSELECT\b.+\bINTO\b', sql_upper, re.DOTALL):
        return {
            "is_safe": False,
            "reason": "SELECT INTO is not allowed (write operation)",
            "sanitized_sql": sanitized_sql,
        }

    return {
        "is_safe": True,
        "reason": "Query passed all guardrail validations",
        "sanitized_sql": sanitized_sql,
    }


def validate_and_sanitize(sql: str) -> Dict[str, Any]:
    logger.info("Running SQL guardrail validation")
    result = validate_sql_guardrails(sql)
    if result["is_safe"]:
        logger.info("SQL passed guardrail validation")
    else:
        logger.warning(f"SQL blocked: {result['reason']}")
    return result
