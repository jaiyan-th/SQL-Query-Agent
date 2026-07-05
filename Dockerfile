# ============================================================
# DEPRECATED — This root Dockerfile is from the legacy
# Node/Express prototype and should NOT be used.
#
# Production Dockerfiles:
#   Backend:  ./backend/Dockerfile  (Python/FastAPI)
#   Frontend: ./frontend/Dockerfile (React/Vite/nginx)
#
# For local development with Docker Compose:
#   docker-compose up -d --build
#
# For production deployment, see render.yaml and README.md
# ============================================================
FROM python:3.11-slim
RUN echo "ERROR: Use ./backend/Dockerfile for the FastAPI backend or ./frontend/Dockerfile for the React frontend. See README.md." && exit 1
