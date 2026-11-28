import os
from pathlib import Path

from dotenv import load_dotenv

BASE = Path(__file__).resolve().parents[1]
load_dotenv(BASE / ".env")
load_dotenv(BASE.parents[1] / ".env.local")

DB_URL = os.getenv("DB_URL") or os.getenv("DATABASE_URL") or "sqlite:///retail.sqlite"
DATABASE_URL_UNPOOLED = os.getenv("DATABASE_URL_UNPOOLED", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
APP_ENV = os.getenv("APP_ENV", "development").lower()
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "" if APP_ENV == "production" else "http://localhost:5173")
FRONTEND_ORIGINS = [origin.strip() for origin in FRONTEND_ORIGIN.split(",") if origin.strip()]
ROW_CAP = 100
TIMEOUT_SECONDS = 5


def check_configuration():
    if APP_ENV not in {"development", "production"}:
        raise ValueError("APP_ENV must be development or production.")
    if APP_ENV == "production" and not GROQ_API_KEY:
        raise ValueError("Production requires GROQ_API_KEY.")


check_configuration()
