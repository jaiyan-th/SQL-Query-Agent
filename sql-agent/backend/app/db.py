import sqlite3
from contextlib import contextmanager
from pathlib import Path
from time import monotonic

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.pool import NullPool

from .config import BASE, DB_URL, TIMEOUT_SECONDS


def make_engine(address):
    url = make_url(address)
    dialect = url.get_backend_name()
    if dialect == "sqlite":
        if not url.database or url.database == ":memory:":
            raise ValueError("Configure a file-backed SQLite database.")
        uri = (BASE / Path(url.database)).resolve().as_uri() + "?mode=ro"

        def connect():
            db = sqlite3.connect(uri, uri=True, check_same_thread=False, timeout=TIMEOUT_SECONDS)
            db.execute("PRAGMA query_only=ON")
            return db

        return create_engine("sqlite://", creator=connect, poolclass=NullPool)
    if dialect not in {"postgresql", "mysql"}:
        raise ValueError("DB_URL must use SQLite, PostgreSQL, or MySQL.")
    if url.drivername == "mysql":
        url = url.set(drivername="mysql+pymysql")
    return create_engine(url, pool_pre_ping=True, connect_args={"connect_timeout": TIMEOUT_SECONDS})


engine = make_engine(DB_URL)


@contextmanager
def read_connection():
    with engine.connect() as conn:
        dialect = conn.dialect.name
        if dialect == "sqlite":
            db = conn.connection.driver_connection
            deadline = monotonic() + TIMEOUT_SECONDS
            db.set_progress_handler(lambda: int(monotonic() >= deadline), 1000)
        elif dialect == "postgresql":
            conn.exec_driver_sql("SET TRANSACTION READ ONLY")
            conn.exec_driver_sql(f"SET LOCAL statement_timeout = {TIMEOUT_SECONDS * 1000}")
        else:
            conn.exec_driver_sql(f"SET SESSION MAX_EXECUTION_TIME={TIMEOUT_SECONDS * 1000}")
            conn.exec_driver_sql("START TRANSACTION READ ONLY")
        try:
            yield conn
        finally:
            if dialect == "sqlite":
                db.set_progress_handler(None, 0)
            conn.rollback()
