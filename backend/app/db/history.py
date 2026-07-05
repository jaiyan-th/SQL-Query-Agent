from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from app.db.models import QueryHistory, Connection
from app.schemas import QueryHistoryItem

def add_history_entry(
    db: Session,
    user_id: int,
    connection_id: Optional[int],
    question: str,
    generated_sql: str,
    mode: str,
    output_format: str,
    status: str,
    row_count: Optional[int] = None,
    execution_time_ms: Optional[int] = None,
    error_message: Optional[str] = None
) -> int:
    """
    Log a new query execution history entry in the platform Neon database.
    """
    try:
        # If there is no connection_id provided, find the active connection for the user
        conn_id = connection_id
        if not conn_id:
            active_conn = db.query(Connection).filter(
                Connection.user_id == user_id, 
                Connection.is_active == True
            ).first()
            if active_conn:
                conn_id = active_conn.id

        entry = QueryHistory(
            user_id=user_id,
            connection_id=conn_id,
            question=question,
            generated_sql=generated_sql,
            mode=mode,
            output_format=output_format,
            status=status,
            row_count=row_count,
            execution_time_ms=execution_time_ms,
            error_message=error_message
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry.id
    except Exception as e:
        db.rollback()
        raise Exception(f"Failed to record query history entry: {str(e)}")

def get_history(db: Session, user_id: int, limit: int = 50) -> List[QueryHistoryItem]:
    """
    Fetch query history logs for the active user, including connection metadata.
    """
    results = db.query(QueryHistory, Connection.connection_name, Connection.database_type)\
        .outerjoin(Connection, QueryHistory.connection_id == Connection.id)\
        .filter(QueryHistory.user_id == user_id)\
        .order_by(QueryHistory.created_at.desc())\
        .limit(limit)\
        .all()

    items = []
    for history, conn_name, db_type in results:
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
                database_type=db_type or "unknown",
                connection_name=conn_name or "Unknown Connection"
            )
        )
    return items

def clear_history(db: Session, user_id: int):
    """Clear query history entries for the specified user."""
    try:
        db.query(QueryHistory).filter(QueryHistory.user_id == user_id).delete()
        db.commit()
    except Exception:
        db.rollback()
        raise
