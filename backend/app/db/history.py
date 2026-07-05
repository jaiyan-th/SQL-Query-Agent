"""
Query history helpers — platform Neon PostgreSQL storage.
"""
import logging
from typing import List, Optional

from sqlalchemy.orm import Session

from app.db.models import QueryHistory, SqliteWorkspace
from app.schemas import QueryHistoryItem

logger = logging.getLogger(__name__)


def add_history_entry(
    db: Session,
    user_id: int,
    workspace_id: Optional[str],
    question: str,
    generated_sql: str,
    mode: str,
    status: str,
    row_count: Optional[int] = None,
    execution_time_ms: Optional[int] = None,
    error_message: Optional[str] = None,
) -> int:
    """Record a query execution in history."""
    try:
        entry = QueryHistory(
            user_id=user_id,
            workspace_id=workspace_id,
            question=question,
            generated_sql=generated_sql,
            mode=mode,
            output_format="table",
            status=status,
            row_count=row_count,
            execution_time_ms=execution_time_ms,
            error_message=error_message,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry.id
    except Exception as e:
        db.rollback()
        raise Exception(f"Failed to record history: {str(e)}")


def get_history(db: Session, user_id: int, limit: int = 50) -> List[QueryHistoryItem]:
    """Fetch query history for a user, joining workspace metadata."""
    results = (
        db.query(QueryHistory, SqliteWorkspace.original_filename)
        .outerjoin(SqliteWorkspace, QueryHistory.workspace_id == SqliteWorkspace.id)
        .filter(QueryHistory.user_id == user_id)
        .order_by(QueryHistory.created_at.desc())
        .limit(limit)
        .all()
    )

    items = []
    for history, filename in results:
        items.append(
            QueryHistoryItem(
                id=history.id,
                question=history.question,
                generated_sql=history.generated_sql,
                mode=history.mode,
                output_format=history.output_format,
                status=history.status,
                row_count=history.row_count,
                execution_time_ms=history.execution_time_ms,
                error_message=history.error_message,
                created_at=history.created_at,
                database_type="sqlite",
                connection_name=filename or "SQLite Database",
            )
        )
    return items


def clear_history(db: Session, user_id: int) -> None:
    try:
        db.query(QueryHistory).filter(QueryHistory.user_id == user_id).delete()
        db.commit()
    except Exception:
        db.rollback()
        raise
