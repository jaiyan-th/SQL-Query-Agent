import os
from pathlib import Path

from dotenv import load_dotenv

BASE = Path(__file__).resolve().parents[1]
load_dotenv(BASE / ".env")

DB_URL = os.getenv("DB_URL", "sqlite:///retail.sqlite")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
APP_ENV = os.getenv("APP_ENV", "development").lower()
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "" if APP_ENV == "production" else "http://localhost:5173")
ROW_CAP = 100
TIMEOUT_SECONDS = 5
WORKSPACE_USER = os.getenv("WORKSPACE_USER", "")
WORKSPACE_PASSWORD = os.getenv("WORKSPACE_PASSWORD", "")


def check_configuration():
    if APP_ENV not in {"development", "production"}:
        raise ValueError("APP_ENV must be development or production.")
    if bool(WORKSPACE_USER) != bool(WORKSPACE_PASSWORD):
        raise ValueError("Set both WORKSPACE_USER and WORKSPACE_PASSWORD.")
    if APP_ENV == "production" and (not WORKSPACE_USER or len(WORKSPACE_PASSWORD) < 16 or not GROQ_API_KEY):
        raise ValueError("Production requires GROQ_API_KEY, WORKSPACE_USER and a workspace password of at least 16 characters.")


check_configuration()
