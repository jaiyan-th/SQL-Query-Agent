"""
Dynamic query suggestions based on the user's active SQLite workspace tables.
"""
import logging

from fastapi import APIRouter, Depends
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.connection import get_db
from app.db.models import SqliteWorkspace
from app.db.schema_introspect import SchemaIntrospector

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/suggestions")
async def get_suggestions(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Return generic suggestions based on the tables in the active SQLite workspace."""
    workspace = db.query(SqliteWorkspace).filter(
        SqliteWorkspace.user_id == current_user.id,
        SqliteWorkspace.is_active == True,
    ).first()

    if not workspace:
        return {"suggestions": []}

    try:
        engine = create_engine(f"sqlite:///{workspace.stored_file_path}")
        introspector = SchemaIntrospector(engine)
        tables = [t.lower() for t in introspector.get_table_names()]
    except Exception as e:
        logger.error(f"Suggestions introspection failed: {str(e)}")
        return {"suggestions": []}

    suggestions = []
    for table in tables[:4]:
        suggestions.append({
            "question": f"Show top 10 records from {table}",
            "table": table,
            "output_format": "table",
        })
        suggestions.append({
            "question": f"How many rows are in {table}?",
            "table": table,
            "output_format": "text",
        })

    # Deduplicate and cap at 8
    seen: set = set()
    unique = []
    for s in suggestions:
        if s["question"] not in seen:
            seen.add(s["question"])
            unique.append(s)
        if len(unique) >= 8:
            break

    return {"suggestions": unique}
