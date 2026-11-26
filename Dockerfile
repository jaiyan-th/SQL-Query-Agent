FROM node:22-alpine AS frontend
WORKDIR /ui
COPY sql-agent/frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY sql-agent/frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /srv/agent
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 APP_ENV=production
COPY sql-agent/backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY sql-agent/backend/app ./app
COPY sql-agent/backend/seed_db.py .
COPY --from=frontend /ui/dist ./static
RUN useradd --create-home agent && chown agent:agent /srv/agent
USER agent
RUN python seed_db.py
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
