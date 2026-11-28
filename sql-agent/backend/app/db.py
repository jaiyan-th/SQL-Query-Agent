import base64
import sqlite3
import tempfile
from contextlib import contextmanager
from pathlib import Path
from threading import Lock
from time import monotonic

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.pool import NullPool

from .config import BASE, DB_URL, TIMEOUT_SECONDS

_engine_lock = Lock()
MAX_SQLITE_BYTES = 25 * 1024 * 1024


def make_engine(address):
    url = make_url(address)
    dialect = url.get_backend_name()
    if dialect == "sqlite":
        if not url.database or url.database == ":memory:":
            raise ValueError("Configure a file-backed SQLite database.")
        raw_path = Path(url.database)
        resolved = raw_path.resolve() if raw_path.is_absolute() else (BASE / raw_path).resolve()
        if not resolved.is_file():
            raise ValueError(f"SQLite file not found: {resolved.name}")
        uri = resolved.as_uri() + "?mode=ro"

        def connect():
            conn = sqlite3.connect(uri, uri=True, check_same_thread=False, timeout=TIMEOUT_SECONDS)
            conn.execute("PRAGMA query_only=ON")
            return conn

        return create_engine("sqlite://", creator=connect, poolclass=NullPool)
    if dialect not in {"postgresql", "mysql"}:
        raise ValueError("DB_URL must use SQLite, PostgreSQL, or MySQL.")
    if url.drivername in {"postgresql", "postgres"}:
        url = url.set(drivername="postgresql+psycopg2")
    elif url.drivername == "mysql":
        url = url.set(drivername="mysql+pymysql")
    return create_engine(url, pool_pre_ping=True, connect_args={"connect_timeout": TIMEOUT_SECONDS})


try:
    engine = make_engine(DB_URL)
    _current_url = DB_URL
except Exception:
    engine = None
    _current_url = ""


def _describe_url(address: str) -> dict:
    url = make_url(address)
    dialect = url.get_backend_name()
    if dialect == "sqlite":
        name = Path(url.database or "database.sqlite").name
        return {"dialect": "sqlite", "label": name}
    host = url.host or "localhost"
    port = f":{url.port}" if url.port else ""
    db_name = url.database or ""
    return {"dialect": dialect, "label": f"{host}{port}/{db_name}"}


def current_db_info() -> dict:
    with _engine_lock:
        if engine is None:
            return {"connected": False, "dialect": "", "label": "Disconnected"}
        if _current_url:
            desc = _describe_url(_current_url)
        else:
            dialect = getattr(engine.dialect, "name", "sqlite")
            desc = {"dialect": dialect, "label": getattr(engine.url, "database", "") or "connected"}
        return {**desc, "connected": True}


def disconnect_engine() -> dict:
    global engine, _current_url
    with _engine_lock:
        previous = engine
        engine = None
        _current_url = ""
    if previous is not None:
        previous.dispose()
    return {"connected": False, "dialect": "", "label": "Disconnected"}


def _verify_read_connection(target_engine):
    with target_engine.connect() as conn:
        dialect = conn.dialect.name
        if dialect == "postgresql":
            conn.exec_driver_sql("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY")
            conn.exec_driver_sql("SET TRANSACTION READ ONLY")
        elif dialect == "mysql":
            conn.exec_driver_sql("SET SESSION TRANSACTION READ ONLY")
            conn.exec_driver_sql("START TRANSACTION READ ONLY")
        conn.exec_driver_sql("SELECT 1").scalar_one()
        conn.rollback()


def switch_engine(address: str) -> dict:
    global engine, _current_url
    candidate = make_engine(address.strip())
    try:
        _verify_read_connection(candidate)
    except Exception:
        candidate.dispose()
        raise
    with _engine_lock:
        previous = engine
        engine = candidate
        _current_url = address.strip()
    if previous is not None:
        previous.dispose()
    return _describe_url(address.strip())


def save_uploaded_sqlite(filename: str, data_base64: str) -> dict:
    try:
        raw = base64.b64decode(data_base64, validate=True)
    except Exception as exc:
        raise ValueError("Invalid base64 file payload.") from exc
    if len(raw) > MAX_SQLITE_BYTES:
        raise ValueError("SQLite file must be 25 MB or smaller.")
    if not raw.startswith(b"SQLite format 3\x00"):
        raise ValueError("Uploaded file is not a valid SQLite 3 database.")
    safe_name = Path(filename or "uploaded.sqlite").name
    safe_name = "".join(c if c.isalnum() or c in "._-" else "_" for c in safe_name) or "uploaded.sqlite"
    upload_dir = Path(tempfile.gettempdir()) / "sql_query_agent_uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    target = upload_dir / safe_name
    target.write_bytes(raw)
    return switch_engine("sqlite:///" + target.as_posix())


@contextmanager
def read_connection():
    with _engine_lock:
        active = engine
    if active is None:
        raise ValueError("No database connected. Connect a database first.")
    with active.connect() as conn:
        dialect = conn.dialect.name
        if dialect == "sqlite":
            driver_conn = conn.connection.driver_connection
            deadline = monotonic() + TIMEOUT_SECONDS
            driver_conn.set_progress_handler(lambda: int(monotonic() >= deadline), 1000)
        elif dialect == "postgresql":
            conn.exec_driver_sql("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY")
            conn.exec_driver_sql("SET TRANSACTION READ ONLY")
            conn.exec_driver_sql(f"SET LOCAL statement_timeout = {TIMEOUT_SECONDS * 1000}")
        else:
            conn.exec_driver_sql(f"SET SESSION MAX_EXECUTION_TIME={TIMEOUT_SECONDS * 1000}")
            conn.exec_driver_sql("SET SESSION TRANSACTION READ ONLY")
            conn.exec_driver_sql("START TRANSACTION READ ONLY")
        try:
            yield conn
        finally:
            if dialect == "sqlite":
                driver_conn.set_progress_handler(None, 0)
            conn.rollback()
