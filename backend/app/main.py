"""
QueryGen AI — FastAPI main application entry point.

Production-ready: PostgreSQL + Qdrant Cloud + Groq/Gemini LLM.
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)
logger = logging.getLogger(__name__)

# ── Create FastAPI app ────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Schema-Aware RAG-Powered Natural Language to SQL Agent. "
        "Two-function design: Function 1 generates SQL, Function 2 generates and executes. "
        "PostgreSQL + Qdrant Cloud + Groq/Gemini."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS middleware ───────────────────────────────────────────
# Explicitly allow both localhost origins for dev frontend (port 5173)
# and wildcard for direct API/docs access from any domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register all API routers ──────────────────────────────────
from app.api import health, connections, rag, generate, generate_and_run, history, auth, suggestions

app.include_router(health.router,            prefix="/api", tags=["Health"])
app.include_router(connections.router,       prefix="/api", tags=["Connections"])
app.include_router(auth.router,              prefix="/api", tags=["Authentication"])
app.include_router(rag.router,               prefix="/api", tags=["RAG"])
app.include_router(generate.router,          prefix="/api", tags=["Query Generation"])
app.include_router(generate_and_run.router,  prefix="/api", tags=["Query Execution"])
app.include_router(history.router,           prefix="/api", tags=["History"])
app.include_router(suggestions.router,       prefix="/api", tags=["Suggestions"])



# ── Lifecycle events ──────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    """Log startup info and validate critical configuration."""
    logger.info("=" * 60)
    logger.info(f"  {settings.APP_NAME} starting up")
    logger.info(f"  Environment : {settings.APP_ENV}")
    logger.info(f"  LLM Provider: {settings.LLM_PROVIDER}")
    logger.info(f"  Qdrant URL  : {settings.QDRANT_URL}")
    logger.info(f"  Qdrant Coll : {settings.QDRANT_COLLECTION_NAME}")
    logger.info(f"  DB Configured: {bool(settings.DATABASE_URL)}")
    logger.info(f"  Allow Write : {settings.ALLOW_WRITE}")
    logger.info("=" * 60)

    # Initialize tables in Neon database on startup
    from app.db.connection import Base, get_engine
    from app.db.user import User  # import User so metadata is registered
    try:
        Base.metadata.create_all(bind=get_engine())
        logger.info("Successfully checked and initialized database tables (users)")
    except Exception as e:
        logger.error(f"Failed to initialize database tables: {str(e)}")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    logger.info(f"Shutting down {settings.APP_NAME}")


# ── Direct execution ──────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.APP_ENV == "development"
    )
