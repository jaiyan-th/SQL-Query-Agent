"""
Query history storage and retrieval.
Stores in-memory history (can be extended to database).
"""
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.schemas import QueryHistoryItem
import logging

logger = logging.getLogger(__name__)

# In-memory history storage
_query_history: List[Dict[str, Any]] = []
_history_counter = 0


def add_history_entry(
    question: str,
    generated_sql: str,
    mode: str,
    status: str,
    error_message: Optional[str] = None
) -> int:
    """
    Add query to history.
    
    Args:
        question: Natural language question
        generated_sql: Generated SQL query
        mode: "generate" or "execute"
        status: "success", "error", "blocked"
        error_message: Optional error message
        
    Returns:
        Entry ID
    """
    global _history_counter
    
    _history_counter += 1
    
    entry = {
        "id": _history_counter,
        "question": question,
        "generated_sql": generated_sql,
        "mode": mode,
        "status": status,
        "created_at": datetime.now(),
        "error_message": error_message
    }
    
    _query_history.append(entry)
    logger.info(f"Added history entry #{_history_counter}")
    
    return _history_counter


def get_history(limit: int = 50) -> List[QueryHistoryItem]:
    """
    Get query history.
    
    Args:
        limit: Maximum number of entries to return
        
    Returns:
        List of QueryHistoryItem objects
    """
    # Return most recent first
    recent_history = sorted(
        _query_history,
        key=lambda x: x["created_at"],
        reverse=True
    )[:limit]
    
    return [
        QueryHistoryItem(
            id=entry["id"],
            question=entry["question"],
            generated_sql=entry["generated_sql"],
            mode=entry["mode"],
            status=entry["status"],
            created_at=entry["created_at"],
            error_message=entry.get("error_message")
        )
        for entry in recent_history
    ]


def clear_history():
    """Clear all history entries."""
    global _query_history, _history_counter
    _query_history = []
    _history_counter = 0
    logger.info("Cleared query history")
