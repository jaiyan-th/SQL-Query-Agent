from threading import BoundedSemaphore

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy.exc import SQLAlchemyError

from . import agent, auth, config, db, tools
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
                   allow_headers=["Content-Type", "Authorization"])


class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=256)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=256)


class Session(BaseModel):
    session_id: str = Field(min_length=1, max_length=128)


class Question(Session):
    message: str = Field(min_length=1, max_length=4000)


class DbConnectRequest(BaseModel):
    db_url: str = Field(min_length=5, max_length=2000)


class DbUploadRequest(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    data_base64: str = Field(min_length=1)


@app.post("/api/auth/signup")
def signup(request: SignupRequest):
    return auth.signup(request.name, request.email, request.password)


@app.post("/api/auth/login")
def login(request: LoginRequest):
    return auth.login(request.email, request.password)


@app.get("/api/auth/me")
def me(user: dict = Depends(auth.require_user)):
    return {"user": user}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/ready")
def ready():
    try:
        with db.read_connection() as conn:
            conn.exec_driver_sql("SELECT 1").scalar_one()
    except (SQLAlchemyError, ValueError):
        raise HTTPException(503, "Database unavailable.")
    if not config.GROQ_API_KEY:
        raise HTTPException(503, "Model provider is not configured.")
    return {"status": "ready"}


@app.get("/api/schema")
def get_schema(_user: dict = Depends(auth.require_user)):
    info = db.current_db_info()
    if not info.get("connected"):
        return {"tables": [], "db": info}
    try:
        return {"tables": tools.schema(), "db": info}
    except SQLAlchemyError:
        raise HTTPException(503, "Database unavailable. Check DB_URL or run the SQLite seed script.")


@app.get("/api/db")
def get_db_info(_user: dict = Depends(auth.require_user)):
    return {"db": db.current_db_info()}


@app.post("/api/db/connect")
def connect_db(request: DbConnectRequest, _user: dict = Depends(auth.require_user)):
    try:
        info = db.switch_engine(request.db_url)
        return {"status": "connected", "db": info, "tables": tools.schema()}
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    except SQLAlchemyError as exc:
        raise HTTPException(400, f"Could not connect to database: {str(exc).splitlines()[0][:200]}")


@app.post("/api/db/upload")
def upload_db(request: DbUploadRequest, _user: dict = Depends(auth.require_user)):
    try:
        info = db.save_uploaded_sqlite(request.filename, request.data_base64)
        return {"status": "connected", "db": info, "tables": tools.schema()}
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    except SQLAlchemyError as exc:
        raise HTTPException(400, f"Could not open SQLite database: {str(exc).splitlines()[0][:200]}")


@app.post("/api/db/reset")
def reset_db(_user: dict = Depends(auth.require_user)):
    try:
        info = db.switch_engine(config.DB_URL)
        return {"status": "connected", "db": {**info, "connected": True}, "tables": tools.schema()}
    except Exception as exc:
        raise HTTPException(500, f"Could not restore default database: {exc}")


@app.post("/api/db/disconnect")
def disconnect_db(_user: dict = Depends(auth.require_user)):
    info = db.disconnect_engine()
    return {"status": "disconnected", "db": info, "tables": []}


@app.post("/api/chat")
def chat(request: Question, _user: dict = Depends(auth.require_user)):
    message = request.message.strip()
    if not message:
        raise HTTPException(422, "Enter a question.")
    if not chat_slots.acquire(blocking=False):
        raise HTTPException(429, "The workspace is busy. Try again shortly.", headers={"Retry-After": "3"})
    try:
        return agent.chat(request.session_id, message)
    except agent.AgentError as exc:
        raise HTTPException(exc.code, str(exc))
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    except SQLAlchemyError:
        raise HTTPException(503, "Database unavailable. Check DB_URL or run the SQLite seed script.")
    finally:
        chat_slots.release()


@app.post("/api/reset")
def reset(request: Session, _user: dict = Depends(auth.require_user)):
    agent.reset(request.session_id)
    return {"status": "cleared"}


static_dir = BASE / "static"
if not static_dir.is_dir():
    static_dir = BASE.parent / "frontend" / "dist"
if static_dir.is_dir():
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="frontend")
