# ============================================================
# QueryGen AI — Backend Production Dockerfile
# Python 3.11 | FastAPI | PostgreSQL | Qdrant | Groq
# ============================================================
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
# libpq-dev: PostgreSQL client library (required by psycopg2-binary)
# gcc/build-essential: required by dependencies compilation
RUN apt-get update && apt-get install -y \
    gcc \
    build-essential \
    libpq-dev \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run uvicorn in production mode (no --reload)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
