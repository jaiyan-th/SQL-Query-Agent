# ============================================================
# Stage 1: Build React Frontend
# ============================================================
FROM node:18-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
# Build production frontend assets
RUN npm run build

# ============================================================
# Stage 2: Build Python Backend & Package Frontend
# ============================================================
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    build-essential \
    libpq-dev \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY backend/app ./app

# Copy built frontend assets to backend static folder
COPY --from=frontend-builder /frontend/dist ./app/static

# Expose port
EXPOSE 8000

# Run uvicorn in production mode
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
