import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import tempfile
import time
from pathlib import Path

from fastapi import Header, HTTPException

from . import config

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7  # 7 days
_SECRET = (os.getenv("AUTH_SECRET") or secrets.token_urlsafe(32)).encode()


def _auth_db_path() -> Path:
    configured = os.getenv("AUTH_DB_PATH")
    if configured:
        return Path(configured)
    candidate = config.BASE / "auth.sqlite"
    try:
        candidate.parent.mkdir(parents=True, exist_ok=True)
        probe = candidate.parent / ".write_probe"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink(missing_ok=True)
        return candidate
    except OSError:
        return Path(tempfile.gettempdir()) / "sql_agent_auth.sqlite"


AUTH_DB_PATH = _auth_db_path()


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(AUTH_DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at INTEGER NOT NULL
        )
        """
    )
    conn.commit()
    return conn


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
    with _connect() as conn:
        try:
            cur = conn.execute(
                "INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
                (clean_name, clean_email, pw_hash, int(time.time())),
            )
            conn.commit()
            user = {"id": cur.lastrowid, "name": clean_name, "email": clean_email}
        except sqlite3.IntegrityError as exc:
            raise HTTPException(409, "An account with this email already exists.") from exc
    return {"token": _sign_token(user), "user": user}


def login(email: str, password: str) -> dict:
    clean_email = email.strip().lower()
    if not EMAIL_RE.match(clean_email) or not password:
        raise HTTPException(422, "Enter your email and password.")
    with _connect() as conn:
        row = conn.execute("SELECT id, name, email, password_hash FROM users WHERE email = ?", (clean_email,)).fetchone()
    if not row or not _verify_password(password, row["password_hash"]):
        raise HTTPException(401, "Invalid email or password.")
    user = {"id": row["id"], "name": row["name"], "email": row["email"]}
    return {"token": _sign_token(user), "user": user}


def require_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Sign in to access the SQL workspace.")
    token = authorization.split(" ", 1)[1].strip()
    return verify_token(token)
