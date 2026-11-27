from threading import BoundedSemaphore

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy.exc import SQLAlchemyError

from . import agent, config, db, tools
from .config import BASE, FRONTEND_ORIGINS

app = FastAPI(title="SQL Query Agent", openapi_url=None if config.APP_ENV == "production" else "/openapi.json")
chat_slots = BoundedSemaphore(4)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Frame-Options"] = "DENY"
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


app.add_middleware(CORSMiddleware, allow_origins=FRONTEND_ORIGINS, allow_methods=["GET", "POST"],
                   allow_headers=["Content-Type"])


class Session(BaseModel):
    session_id: str = Field(min_length=1, max_length=128)


class Question(Session):
    message: str = Field(min_length=1, max_length=4000)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/ready")
def ready():
    try:
        with db.read_connection() as conn:
            conn.exec_driver_sql("SELECT 1").scalar_one()
    except SQLAlchemyError:
        raise HTTPException(503, "Database unavailable.")
    if not config.GROQ_API_KEY:
        raise HTTPException(503, "Model provider is not configured.")
    return {"status": "ready"}


@app.get("/api/schema")
def get_schema():
    try:
        return {"tables": tools.schema()}
    except SQLAlchemyError:
        raise HTTPException(503, "Database unavailable. Check DB_URL or run the SQLite seed script.")


@app.post("/api/chat")
def chat(request: Question):
    message = request.message.strip()
    if not message:
        raise HTTPException(422, "Enter a question.")
    if not chat_slots.acquire(blocking=False):
        raise HTTPException(429, "The workspace is busy. Try again shortly.", headers={"Retry-After": "3"})
    try:
        return agent.chat(request.session_id, message)
    except agent.AgentError as exc:
        raise HTTPException(exc.code, str(exc))
    except SQLAlchemyError:
        raise HTTPException(503, "Database unavailable. Check DB_URL or run the SQLite seed script.")
    finally:
        chat_slots.release()


@app.post("/api/reset")
def reset(request: Session):
    agent.reset(request.session_id)
    return {"status": "cleared"}


static_dir = BASE / "static"
if not static_dir.is_dir():
    static_dir = BASE.parent / "frontend" / "dist"
if static_dir.is_dir():
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="frontend")
