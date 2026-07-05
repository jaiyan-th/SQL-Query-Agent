from typing import List, Any, Dict, Optional
import logging
from app.llm.client import LLMClient
from app.config import settings

logger = logging.getLogger(__name__)

def is_numeric_col(rows: List[List[Any]], idx: int) -> bool:
    """Check if all values in a column index are numeric."""
    if not rows:
        return False
    for r in rows:
        if r[idx] is not None:
            val = r[idx]
            if not isinstance(val, (int, float)):
                try:
                    float(val)
                except ValueError:
                    return False
    return True

def get_float_val(val: Any) -> float:
    if isinstance(val, (int, float)):
        return float(val)
    try:
        return float(val)
    except (ValueError, TypeError):
        return 0.0

def build_deterministic_text(question: str, columns: List[str], rows: List[List[Any]]) -> str:
    """Build a deterministic text summary fallback."""
    row_count = len(rows)
    if row_count == 0:
        return "No matching records were found in the database for your query."
        
    summary = f"The query returned {row_count} record{'s' if row_count > 1 else ''}. "
    
    # Try to find a key result
    # If there's 1 row and 1 column, just return it
    if row_count == 1 and len(columns) == 1:
        summary += f"The result is {rows[0][0]}."
    # If there are few rows, list some of them
    elif row_count <= 5:
        details = []
        for r in rows:
            details.append(", ".join(f"{col}: {val}" for col, val in zip(columns, r)))
        summary += "Records found:\n" + "\n".join(f"- {d}" for d in details)
    else:
        # Just show the first few rows
        details = []
        for r in rows[:3]:
            details.append(", ".join(f"{col}: {val}" for col, val in zip(columns, r)))
        summary += "First 3 records:\n" + "\n".join(f"- {d}" for d in details) + f"\n...and {row_count - 3} more."
        
    return summary

def build_deterministic_report(question: str, sql: str, columns: List[str], rows: List[List[Any]]) -> str:
    """Build a structured mini report fallback."""
    row_count = len(rows)
    
    # Overview of rows
    important_rows = ""
    if row_count > 0:
        for r in rows[:5]:
            important_rows += f"- " + ", ".join(f"{c}: {v}" for c, v in zip(columns, r)) + "\n"
        if row_count > 5:
            important_rows += f"- ... [Truncated {row_count - 5} additional rows]\n"
    else:
        important_rows = "- No records returned\n"

    report = f"""# QueryGen AI — Structured Mini Report

### Question Asked
> {question}

### SQL Query Used
```sql
{sql}
```

### Key Findings
- Total records retrieved: **{row_count}**
- Database columns: {", ".join(columns)}

### Result Overview
A database query was executed successfully on Neon PostgreSQL. It retrieved {row_count} matching records.

### Important Rows (Up to 5)
{important_rows}
### Conclusion
The data has been successfully retrieved. For full tabular representation or visualization options, please refer to the visual tabs.
"""
    return report

def build_deterministic_analysis(question: str, columns: List[str], rows: List[List[Any]]) -> str:
    """Build a deterministic analysis fallback."""
    row_count = len(rows)
    if row_count == 0:
        return "Analysis is limited because no data was returned from the database."
        
    # Check for numeric columns
    numeric_col_indices = [idx for idx in range(len(columns)) if is_numeric_col(rows, idx)]
    text_col_indices = [idx for idx in range(len(columns)) if idx not in numeric_col_indices]
    
    analysis_lines = [
        "# Analytical Insights",
        f"- **Total Rows Returned**: {row_count}",
    ]
    
    # Calculate stats if numeric columns exist
    if numeric_col_indices:
        for num_idx in numeric_col_indices:
            col_name = columns[num_idx]
            values = [get_float_val(r[num_idx]) for r in rows if r[num_idx] is not None]
            if values:
                highest = max(values)
                lowest = min(values)
                avg = sum(values) / len(values)
                
                analysis_lines.append(f"- **Column '{col_name}' Metrics**:")
                analysis_lines.append(f"  - Highest value: `{highest}`")
                analysis_lines.append(f"  - Lowest value: `{lowest}`")
                analysis_lines.append(f"  - Average value: `{avg:.2f}`")
                
                # Check for category with max/min
                if text_col_indices:
                    cat_idx = text_col_indices[0]
                    max_row = max(rows, key=lambda r: get_float_val(r[num_idx]) if r[num_idx] is not None else -999999)
                    min_row = min(rows, key=lambda r: get_float_val(r[num_idx]) if r[num_idx] is not None else 999999)
                    analysis_lines.append(f"  - Highest category: `{max_row[cat_idx]}` ({col_name}: {max_row[num_idx]})")
                    analysis_lines.append(f"  - Lowest category: `{min_row[cat_idx]}` ({col_name}: {min_row[num_idx]})")
    
    analysis_lines.extend([
        "\n### Observations",
        "- The query returned a valid set of database records matching the criteria.",
        f"- The data shows a distribution across {len(columns)} attributes.",
        "\n### Caution/Limitation",
        "- This analysis is generated deterministically from the direct SQL result rows.",
        "- Ensure the correct filters were applied in your question to ensure accuracy."
    ])
    
    return "\n".join(analysis_lines)

def format_result(
    question: str,
    sql: str,
    columns: List[str],
    rows: List[List[Any]],
    format_type: str
) -> str:
    """
    Format SQL execution results into natural-language text, structured reports, or analyses.
    Uses LLM for phrasing when available, falling back to deterministic builders on error.
    """
    # 1. Fallbacks (always prepare in case LLM fails or is disabled)
    if format_type == "text":
        fallback = build_deterministic_text(question, columns, rows)
    elif format_type == "report":
        fallback = build_deterministic_report(question, sql, columns, rows)
    elif format_type == "analysis":
        fallback = build_deterministic_analysis(question, columns, rows)
    else:
        fallback = ""

    # Check if we should use LLM to phrase it nicely
    if format_type not in ["text", "report", "analysis"]:
        return ""
        
    try:
        # Limit rows passed to LLM context to prevent context bloat (top 20 rows are enough for phrasing)
        context_rows = rows[:20]
        context_data = {
            "columns": columns,
            "rows": context_rows,
            "total_rows_in_db": len(rows),
            "is_truncated": len(rows) > 20
        }
        
        prompt = f"""
        You are an expert data analyst assistant. Your task is to write a response in the requested format based ONLY on the provided SQL query results.
        Do not make up any facts, names, or numbers. Only use the returned rows and columns.
        If the data is truncated in the context, mention it but base your insights on the provided rows.
        
        Format Type: {format_type.upper()}
        Original Question: {question}
        SQL Query Executed: {sql}
        
        SQL Results Context:
        {context_data}
        
        Guidelines:
        - If Format Type is TEXT: Provide a short, direct 1-3 sentence natural-language summary of the findings, including the row count.
        - If Format Type is REPORT: Return a structured markdown report with sections: # [Title], ## Question Asked, ## SQL Used, ## Key Findings, ## Result Overview, ## Important Rows, and ## Conclusion.
        - If Format Type is ANALYSIS: Return markdown analytical insights detailing counts, highest/lowest attributes (if numeric), observations, and cautions/limitations.
        """
        
        # Initialize LLM Client
        llm_client = LLMClient()
        
        # Request completion
        logger.info(f"Requesting LLM formatting for format_type='{format_type}'...")
        response_text = llm_client.client.chat.completions.create(
            model=llm_client.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=800
        ).choices[0].message.content
        
        if response_text and response_text.strip():
            return response_text.strip()
            
    except Exception as e:
        logger.error(f"LLM result formatting failed, using deterministic fallback: {e}")
        
    return fallback
