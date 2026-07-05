"""
LLM prompt templates for SQL generation.
"""
from typing import Optional

def build_sql_generation_prompt(
    question: str,
    schema_context: str,
    database_type: str,
    previous_sql: Optional[str] = None,
    error_message: Optional[str] = None
) -> str:
    """
    Build prompt for SQL generation.
    """
    
    base_prompt = f"""You are QueryGen AI, an expert SQLite query generator.

Generate only valid SQLite SQL. Use ONLY the tables and columns provided in the schema context below.
Do NOT invent table names or column names. Return only ONE SQL query.

RULES:
1. Generate ONLY safe read-only SELECT queries (or WITH … SELECT CTEs).
2. NEVER generate: INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE, REPLACE,
   ATTACH, DETACH, VACUUM, PRAGMA, BEGIN, COMMIT, ROLLBACK, SAVEPOINT, REINDEX, ANALYZE.
3. Use only tables and columns from the schema context.
4. If the question cannot be answered from the schema, say so in the explanation.
5. Always add a LIMIT clause unless the query is a single-row aggregation.
6. Use proper JOIN syntax when querying multiple tables.

DATABASE TYPE: {database_type}

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
    """
    return f"""Validate if this SQL query is safe (SELECT only):

{sql}

Respond with JSON:
{{
  "is_safe": true/false,
  "reason": "explanation"
}}
"""
