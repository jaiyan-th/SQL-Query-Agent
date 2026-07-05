"""
LLM prompt templates for SQL generation.
"""
from typing import Optional


def build_sql_generation_prompt(
    question: str,
    schema_context: str,
    previous_sql: Optional[str] = None,
    error_message: Optional[str] = None
) -> str:
    """
    Build prompt for SQL generation.
    
    Args:
        question: Natural language question
        schema_context: Retrieved schema context from RAG
        previous_sql: Previous SQL that failed (for self-correction)
        error_message: Database error message (for self-correction)
        
    Returns:
        Formatted prompt string
    """
    
    base_prompt = f"""You are QueryGen AI, a safe and accurate SQL generation assistant.

Your task is to convert natural language questions into valid SQL queries using ONLY the provided database schema context.

CRITICAL RULES:
1. Use ONLY table names and column names from the provided schema context
2. NEVER invent or guess table/column names
3. Generate ONLY SELECT queries
4. WITH clauses are allowed ONLY if the final statement is SELECT
5. NEVER generate: INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, REPLACE, MERGE, GRANT, REVOKE, PRAGMA, ATTACH, DETACH, EXEC, EXECUTE, CALL
6. Always use proper JOIN syntax when querying multiple tables
7. Use WHERE clauses for filtering
8. Use aggregate functions (COUNT, SUM, AVG, etc.) when appropriate
9. Add ORDER BY for result sorting when relevant
10. ALWAYS add LIMIT clause unless query is aggregation-only

{schema_context}

USER QUESTION: {question}
"""
    
    # Add self-correction context if provided
    if previous_sql and error_message:
        base_prompt += f"""

PREVIOUS ATTEMPT FAILED:
SQL: {previous_sql}
Error: {error_message}

Please analyze the error and generate a corrected SQL query.
"""
    
    base_prompt += """

You MUST respond with ONLY valid JSON in this exact format:
{
  "sql": "your SQL query here",
  "explanation": "brief explanation of what the query does",
  "tables_used": ["table1", "table2"],
  "confidence": 0.95,
  "needs_clarification": false,
  "clarification_question": null
}

If the question is ambiguous or you cannot generate a safe query, set needs_clarification to true and provide a clarification_question.

RESPOND WITH JSON ONLY. NO OTHER TEXT.
"""
    
    return base_prompt


def build_validation_prompt(sql: str) -> str:
    """
    Build prompt for SQL validation.
    
    Args:
        sql: SQL query to validate
        
    Returns:
        Validation prompt
    """
    return f"""Validate if this SQL query is safe (SELECT only):

{sql}

Respond with JSON:
{{
  "is_safe": true/false,
  "reason": "explanation"
}}
"""
