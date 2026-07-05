"""
QueryGen AI — FastAPI application entry point.

SQLite upload mode: users upload .db/.sqlite/.sqlite3 files.
Platform database: Neon PostgreSQL (metadata only).
Vector store: Qdrant Cloud (schema embeddings only).
LLM: Groq primary / Gemini fallback.
"""
import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse

from app.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "RAG-Powered Natural Language to SQLite SQL Agent. "
        "Upload a SQLite file, index schema, ask questions, get SQL."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
from app.api import health, auth, sqlite, rag, generate, generate_and_run, history, suggestions

app.include_router(health.router,            prefix="/api", tags=["Health"])
app.include_router(auth.router,              prefix="/api", tags=["Authentication"])
app.include_router(sqlite.router,            prefix="/api", tags=["SQLite Workspace"])
app.include_router(rag.router,               prefix="/api", tags=["RAG"])
app.include_router(generate.router,          prefix="/api", tags=["Query Generation"])
app.include_router(generate_and_run.router,  prefix="/api", tags=["Query Execution"])
app.include_router(history.router,           prefix="/api", tags=["History"])
app.include_router(suggestions.router,       prefix="/api", tags=["Suggestions"])

# ── Static files (production SPA) ─────────────────────────────────────────────
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    assets_dir = os.path.join(static_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{catchall:path}")
    async def serve_spa(catchall: str):
        if any(catchall.startswith(p) for p in ("api/", "docs", "redoc", "openapi.json")):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not found")
        index = os.path.join(static_dir, "index.html")
        return FileResponse(index) if os.path.exists(index) else RedirectResponse(url="/docs")
else:
    @app.get("/")
    async def root_redirect():
        return RedirectResponse(url="/docs")


# ── Startup ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    logger.info("=" * 60)
    logger.info(f"  {settings.APP_NAME} v2 starting up")
    logger.info(f"  Environment : {settings.APP_ENV}")
    logger.info(f"  LLM         : {settings.LLM_PROVIDER}")
    logger.info(f"  Qdrant URL  : {settings.QDRANT_URL}")
    logger.info(f"  Storage dir : {settings.SQLITE_STORAGE_DIR}")
    logger.info(f"  Max upload  : {settings.MAX_SQLITE_UPLOAD_MB} MB")
    logger.info("=" * 60)

    from app.db.connection import Base, get_engine
    from app.db.models import User, SqliteWorkspace, QueryHistory  # register all models
    try:
        Base.metadata.create_all(bind=get_engine())
        logger.info("Platform database tables checked/created.")
    except Exception as e:
        logger.error(f"DB table init failed: {str(e)}")

    # Ensure SQLite storage directory exists
    import os as _os
    _os.makedirs(settings.SQLITE_STORAGE_DIR, exist_ok=True)


@app.on_event("shutdown")
async def shutdown_event():
    logger.info(f"Shutting down {settings.APP_NAME}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.APP_ENV == "development",
    )
