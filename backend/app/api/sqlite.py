"""
SQLite Workspace API endpoints.

Replaces the old database connection URL flow.
Users upload a .db / .sqlite / .sqlite3 file; the backend stores it
securely on disk and records metadata in Neon PostgreSQL.
"""
import os
import uuid
import sqlite3
import datetime
import shutil
import logging
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.api.auth import get_current_user
from app.db.connection import get_db
from app.db.models import SqliteWorkspace
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_EXTENSIONS = {".db", ".sqlite", ".sqlite3"}

BASE_DIR = Path(__file__).resolve().parents[2]
SQLITE_STORAGE_DIR = Path(os.getenv("SQLITE_STORAGE_DIR", BASE_DIR / "storage" / "sqlite_workspaces")).resolve()

# ── Response schemas ──────────────────────────────────────────────────────────

class UploadSqliteResponse(BaseModel):
    success: bool
    message: str
    workspace_id: Optional[str] = None
    database_type: str = "sqlite"
    original_filename: Optional[str] = None
    table_count: Optional[int] = None


class ActiveSqliteWorkspaceResponse(BaseModel):
    has_active_sqlite: bool
    workspace_id: Optional[str] = None
    database_type: str = "sqlite"
    original_filename: Optional[str] = None
    table_count: Optional[int] = None
    uploaded_at: Optional[datetime.datetime] = None
    schema_indexed: bool = False
    schema_indexed_at: Optional[datetime.datetime] = None


class DeleteSqliteWorkspaceResponse(BaseModel):
    success: bool
    message: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_storage_root() -> Path:
    """Return the absolute path to the SQLite storage directory, creating it if needed."""
    SQLITE_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    return SQLITE_STORAGE_DIR


def _workspace_dir(user_id: int, workspace_id: str) -> Path:
    """Return (and create) the directory for one workspace."""
    path = _get_storage_root() / str(user_id) / workspace_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def _validate_sqlite_file(file_path: Path) -> int:
    """
    Open the file with sqlite3 and run SELECT on sqlite_master.
    Returns the number of tables found, excluding sqlite_ internal tables.
    Raises ValueError if the file is not a valid SQLite database.
    """
    try:
        conn = sqlite3.connect(f"file:{file_path.as_posix()}?mode=ro", uri=True)
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall() if not row[0].startswith("sqlite_")]
        conn.close()
        return len(tables)
    except Exception as e:
        raise ValueError(f"Invalid SQLite database file: {str(e)}")



# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/sqlite/upload", response_model=UploadSqliteResponse)
async def upload_sqlite_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Upload a SQLite database file (.db / .sqlite / .sqlite3).

    Steps:
    1. Validate extension and size.
    2. Save to a secure, generated path.
    3. Validate it is a real SQLite database.
    4. Deactivate any previous workspace for this user.
    5. Create a new active workspace record.
    """
    # --- Extension check -------------------------------------------------
    original_name = file.filename or "upload"
    ext = os.path.splitext(original_name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported file type '{ext}'. Please upload a .db, .sqlite, or .sqlite3 file.",
        )

    # --- Generate workspace id and absolute path -----------------
    workspace_id = str(uuid.uuid4())
    
    # Ensure directory exists before saving
    SQLITE_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    workspace_dir = SQLITE_STORAGE_DIR / str(current_user.id) / workspace_id
    workspace_dir.mkdir(parents=True, exist_ok=True)
    stored_file_path = workspace_dir / "database.sqlite"

    # --- Save physically using safe file writing -----------------
    try:
        with open(stored_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Failed to write SQLite file: {e}")
        # Clean up dir if created
        shutil.rmtree(workspace_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail="Failed to store uploaded file.")

    # After saving, verify
    if not stored_file_path.exists():
        raise HTTPException(status_code=500, detail="SQLite file was not saved successfully.")
    
    total_size = stored_file_path.stat().st_size
    if total_size == 0:
        shutil.rmtree(workspace_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Uploaded SQLite file is empty.")

    # Enforce size limit
    max_bytes = settings.MAX_SQLITE_UPLOAD_MB * 1024 * 1024
    if total_size > max_bytes:
        shutil.rmtree(workspace_dir, ignore_errors=True)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {settings.MAX_SQLITE_UPLOAD_MB} MB upload limit.",
        )

    # --- Validate SQLite -------------------------------------------------
    try:
        table_count = _validate_sqlite_file(stored_file_path)
    except ValueError as e:
        shutil.rmtree(workspace_dir, ignore_errors=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )

    if table_count == 0:
        shutil.rmtree(workspace_dir, ignore_errors=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The uploaded SQLite database contains no tables.",
        )

    # --- Deactivate old workspaces ---------------------------------------
    db.query(SqliteWorkspace).filter(
        SqliteWorkspace.user_id == current_user.id,
        SqliteWorkspace.is_active == True,
    ).update({"is_active": False})

    # --- Create new workspace record ------------------------------------
    workspace = SqliteWorkspace(
        id=workspace_id,
        user_id=current_user.id,
        original_filename=original_name,
        stored_file_path=str(stored_file_path),
        file_size_bytes=total_size,
        table_count=table_count,
        is_active=True,
        schema_indexed=False,
    )
    db.add(workspace)
    db.commit()
    db.refresh(workspace)

    logger.info(
        f"SQLite workspace created: user={current_user.id} "
        f"workspace={workspace_id} tables={table_count} file={original_name}"
    )

    return UploadSqliteResponse(
        success=True,
        message="SQLite database uploaded successfully.",
        workspace_id=workspace_id,
        database_type="sqlite",
        original_filename=original_name,
        table_count=table_count,
    )


@router.get("/sqlite/active", response_model=ActiveSqliteWorkspaceResponse)
async def get_active_sqlite_workspace(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Return metadata for the user's active SQLite workspace.
    Never exposes the stored file path.
    """
    workspace = db.query(SqliteWorkspace).filter(
        SqliteWorkspace.user_id == current_user.id,
        SqliteWorkspace.is_active == True,
    ).first()

    if not workspace:
        return ActiveSqliteWorkspaceResponse(has_active_sqlite=False)

    if not Path(workspace.stored_file_path).exists():
        logger.warning(
            f"Active workspace file not found at '{workspace.stored_file_path}'. "
            "Deactivating workspace automatically."
        )
        workspace.is_active = False
        db.commit()
        return ActiveSqliteWorkspaceResponse(has_active_sqlite=False)

    return ActiveSqliteWorkspaceResponse(
        has_active_sqlite=True,
        workspace_id=workspace.id,
        database_type="sqlite",
        original_filename=workspace.original_filename,
        table_count=workspace.table_count,
        uploaded_at=workspace.uploaded_at,
        schema_indexed=bool(workspace.schema_indexed),
        schema_indexed_at=workspace.schema_indexed_at,
    )


@router.delete("/sqlite/active", response_model=DeleteSqliteWorkspaceResponse)
async def delete_active_sqlite_workspace(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Delete the user's active SQLite workspace:
    - Remove the stored SQLite file from disk.
    - Mark workspace inactive in the platform database.
    """
    workspace = db.query(SqliteWorkspace).filter(
        SqliteWorkspace.user_id == current_user.id,
        SqliteWorkspace.is_active == True,
    ).first()

    if not workspace:
        return DeleteSqliteWorkspaceResponse(
            success=False,
            message="No active SQLite workspace found.",
        )

    # Remove file from disk
    try:
        sqlite_path = Path(workspace.stored_file_path).resolve()
        workspace_dir = sqlite_path.parent
        if workspace_dir.exists() and workspace_dir.is_dir():
            shutil.rmtree(workspace_dir, ignore_errors=True)
    except Exception as e:
        logger.warning(f"Failed to remove workspace files: {e}")

    workspace.is_active = False
    db.commit()

    logger.info(f"SQLite workspace deleted: user={current_user.id} workspace={workspace.id}")

    return DeleteSqliteWorkspaceResponse(
        success=True,
        message="SQLite workspace removed successfully.",
    )


@router.get("/sqlite/schema")
async def get_sqlite_schema(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Introspect the active SQLite database workspace and return the structured schemas
    along with row counts and column constraints.
    """
    workspace = db.query(SqliteWorkspace).filter(
        SqliteWorkspace.user_id == current_user.id,
        SqliteWorkspace.is_active == True,
    ).first()

    if not workspace:
        return {"tables": []}

    sqlite_path = Path(workspace.stored_file_path).resolve()
    if not sqlite_path.exists():
        workspace.is_active = False
        db.commit()
        return {"tables": []}

    try:
        from app.db.schema_introspect import SchemaIntrospector
        from sqlalchemy import create_engine, text

        engine = create_engine(f"sqlite:///{sqlite_path.as_posix()}")
        introspector = SchemaIntrospector(engine)
        schemas = introspector.get_all_schemas()

        # Gather row counts for each table
        with engine.connect() as conn:
            for s in schemas:
                table_name = s["table_name"]
                try:
                    # Enclose in double quotes to avoid syntax errors with special chars
                    count_res = conn.execute(text(f'SELECT COUNT(*) FROM "{table_name}"'))
                    s["row_count"] = count_res.scalar() or 0
                except Exception as count_err:
                    logger.warning(f"Failed to count rows for {table_name}: {count_err}")
                    s["row_count"] = 0

        return {"tables": schemas}

    except Exception as e:
        logger.error(f"Failed to fetch SQLite schema: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to introspect active database schema: {str(e)}"
        )

