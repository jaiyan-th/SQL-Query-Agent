import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import tempfile
import time
from pathlib import Path

from fastapi import Header, HTTPException
from sqlalchemy import (
    BigInteger,
    Column,
    Integer,
    MetaData,
    String,
    Table,
    create_engine,
    insert,
    select,
)
from sqlalchemy.engine import make_url
from sqlalchemy.exc import IntegrityError
from sqlalchemy.pool import NullPool

from . import config

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7  # 7 days
_SECRET = (os.getenv("AUTH_SECRET") or secrets.token_urlsafe(32)).encode()

DEFAULT_AUTH_DB_PATH = Path(tempfile.gettempdir()) / "sql_agent_auth.sqlite"
AUTH_DB_PATH = DEFAULT_AUTH_DB_PATH

_auth_engine = None
_metadata = MetaData()

users_table = Table(
    "users",
    _metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("name", String(120), nullable=False),
    Column("email", String(254), nullable=False, unique=True),
    Column("password_hash", String(256), nullable=False),
    Column("created_at", BigInteger, nullable=False),
)


def _get_auth_engine():
    global _auth_engine
    target_url = os.getenv("AUTH_DB_URL")
    if not target_url:
        # If test suite patched AUTH_DB_PATH, honor SQLite test database
        if str(AUTH_DB_PATH) != str(DEFAULT_AUTH_DB_PATH):
            target_url = f"sqlite:///{Path(AUTH_DB_PATH).as_posix()}"
        elif config.DB_URL and config.DB_URL.startswith(("postgresql://", "postgres://", "postgresql+psycopg2://")):
            target_url = config.DB_URL
        else:
            target_url = f"sqlite:///{Path(AUTH_DB_PATH).as_posix()}"

    url = make_url(target_url)
    if url.drivername in {"postgresql", "postgres"}:
        url = url.set(drivername="postgresql+psycopg2")
        engine = create_engine(url, pool_pre_ping=True)
    elif url.get_backend_name() == "sqlite":
        engine = create_engine(url, poolclass=NullPool)
    else:
        engine = create_engine(url, pool_pre_ping=True)

    with engine.begin() as conn:
        users_table.create(conn, checkfirst=True)
    return engine


def _hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=16384, r=8, p=1)
    return base64.b64encode(salt).decode() + ":" + base64.b64encode(digest).decode()


def _verify_password(password: str, stored: str) -> bool:
    try:
        salt_b64, digest_b64 = stored.split(":", 1)
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(digest_b64)
    except Exception:
        return False
    actual = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=16384, r=8, p=1)
    return hmac.compare_digest(actual, expected)


def _sign_token(user: dict) -> str:
    payload = {
        "sub": user["id"],
        "name": user["name"],
        "email": user["email"],
        "exp": int(time.time()) + TOKEN_TTL_SECONDS,
    }
    body = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).decode().rstrip("=")
    sig = base64.urlsafe_b64encode(hmac.new(_SECRET, body.encode(), hashlib.sha256).digest()).decode().rstrip("=")
    return f"{body}.{sig}"


def verify_token(token: str) -> dict:
    try:
        body, sig = token.split(".", 1)
        expected_sig = base64.urlsafe_b64encode(hmac.new(_SECRET, body.encode(), hashlib.sha256).digest()).decode().rstrip("=")
        if not hmac.compare_digest(sig, expected_sig):
            raise ValueError("Invalid signature")
        padded = body + "=" * (-len(body) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded))
        if int(payload.get("exp", 0)) < int(time.time()):
            raise ValueError("Token expired")
        return {"id": payload["sub"], "name": payload["name"], "email": payload["email"]}
    except Exception as exc:
        raise HTTPException(401, "Session expired or invalid. Please sign in again.") from exc


def signup(name: str, email: str, password: str) -> dict:
    clean_name = name.strip()
    clean_email = email.strip().lower()
    if len(clean_name) < 2:
        raise HTTPException(422, "Enter your full name (at least 2 characters).")
    if not EMAIL_RE.match(clean_email):
        raise HTTPException(422, "Enter a valid email address.")
    if len(password) < 6:
        raise HTTPException(422, "Password must be at least 6 characters.")
    pw_hash = _hash_password(password)
    engine = _get_auth_engine()
    try:
        with engine.begin() as conn:
            stmt = insert(users_table).values(
                name=clean_name,
                email=clean_email,
                password_hash=pw_hash,
                created_at=int(time.time()),
            )
            res = conn.execute(stmt)
            user_id = res.inserted_primary_key[0]
            user = {"id": user_id, "name": clean_name, "email": clean_email}
    except IntegrityError as exc:
        raise HTTPException(409, "An account with this email already exists.") from exc
    return {"token": _sign_token(user), "user": user}


def login(email: str, password: str) -> dict:
    clean_email = email.strip().lower()
    if not EMAIL_RE.match(clean_email) or not password:
        raise HTTPException(422, "Enter your email and password.")
    engine = _get_auth_engine()
    with engine.connect() as conn:
        stmt = select(
            users_table.c.id,
            users_table.c.name,
            users_table.c.email,
            users_table.c.password_hash,
        ).where(users_table.c.email == clean_email)
        row = conn.execute(stmt).mappings().first()
    if not row or not _verify_password(password, row["password_hash"]):
        raise HTTPException(401, "Invalid email or password.")
    user = {"id": row["id"], "name": row["name"], "email": row["email"]}
    return {"token": _sign_token(user), "user": user}


def require_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Sign in to access the SQL workspace.")
    token = authorization.split(" ", 1)[1].strip()
    return verify_token(token)
