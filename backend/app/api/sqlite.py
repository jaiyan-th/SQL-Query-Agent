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

def _get_storage_root() -> str:
    """Return the absolute path to the SQLite storage directory, creating it if needed."""
    root = os.path.abspath(settings.SQLITE_STORAGE_DIR)
    os.makedirs(root, exist_ok=True)
    return root


def _workspace_dir(user_id: int, workspace_id: str) -> str:
    """Return (and create) the directory for one workspace."""
    path = os.path.join(_get_storage_root(), str(user_id), workspace_id)
    os.makedirs(path, exist_ok=True)
    return path


def _validate_sqlite_file(file_path: str) -> int:
    """
    Open the file with sqlite3 and run SELECT on sqlite_master.
    Returns the number of tables found.
    Raises ValueError if the file is not a valid SQLite database.
    """
    try:
        conn = sqlite3.connect(f"file:{file_path}?mode=ro", uri=True)
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
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

    # --- Size check (read into memory in chunks) -------------------------
    max_bytes = settings.MAX_SQLITE_UPLOAD_MB * 1024 * 1024
    chunks = []
    total = 0
    while True:
        chunk = await file.read(256 * 1024)  # 256 KB
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds the {settings.MAX_SQLITE_UPLOAD_MB} MB upload limit.",
            )
        chunks.append(chunk)

    file_bytes = b"".join(chunks)

    # --- Save to secure path (never the original filename) ---------------
    workspace_id = str(uuid.uuid4())
    dest_dir = _workspace_dir(current_user.id, workspace_id)
    stored_path = os.path.join(dest_dir, "database.sqlite")

    try:
        with open(stored_path, "wb") as f:
            f.write(file_bytes)
    except OSError as e:
        logger.error(f"Failed to write SQLite file: {e}")
        raise HTTPException(status_code=500, detail="Failed to store uploaded file.")

    # --- Validate SQLite -------------------------------------------------
    try:
        table_count = _validate_sqlite_file(stored_path)
    except ValueError as e:
        os.remove(stored_path)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )

    if table_count == 0:
        os.remove(stored_path)
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
        stored_file_path=stored_path,
        file_size_bytes=total,
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
        workspace_dir = os.path.dirname(workspace.stored_file_path)
        if os.path.exists(workspace_dir):
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
