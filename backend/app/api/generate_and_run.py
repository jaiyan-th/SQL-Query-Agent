"""
Function 2: Generate SQLite SQL and execute it on the uploaded SQLite file.
"""
import logging

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.schemas import QueryRequest, GenerateAndRunResponse
from app.services.query_execution_service import generate_and_execute
from app.api.auth import get_current_user
from app.db.connection import get_db
from app.db.models import SqliteWorkspace

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/generate-and-run", response_model=GenerateAndRunResponse)
async def generate_and_run_endpoint(
    request: QueryRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Function 2: Generate SQLite SQL, validate, execute on the uploaded SQLite
    file, and return result rows.
    """
    workspace = db.query(SqliteWorkspace).filter(
        SqliteWorkspace.user_id == current_user.id,
        SqliteWorkspace.is_active == True,
    ).first()

    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Please upload a SQLite database file before asking questions.",
        )

    import os
    if not os.path.exists(workspace.stored_file_path):
        workspace.is_active = False
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active SQLite database file was not found on the server. Please re-upload your SQLite database file.",
        )

    if not workspace.schema_indexed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please extract and index your SQLite schema before asking questions.",
        )

    try:
        logger.info(
            f"Generate & Run: user={current_user.id}, workspace={workspace.id}"
        )

        # Read-only SQLite URI — prevents any writes to the uploaded file
        sqlite_uri = f"file:{workspace.stored_file_path}?mode=ro"
        engine = create_engine(
            f"sqlite:///{workspace.stored_file_path}",
            connect_args={"uri": False},
        )

        return generate_and_execute(
            db=db,
            user_id=current_user.id,
            workspace_id=workspace.id,
            database_type="sqlite",
            engine=engine,
            question=request.question,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Generate & Run failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Query execution failed: {str(e)}")
