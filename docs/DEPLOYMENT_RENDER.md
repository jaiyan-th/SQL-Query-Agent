# Render Deployment Guide

Follow these steps to deploy **QueryGen AI** using **Render Blueprints** (`render.yaml`) in 5 minutes.

## Option A: Blueprint Deploy on Render (Recommended)

1. **Sign In**: Log into your [Render Dashboard](https://dashboard.render.com).
2. **Create New Blueprint Instance**:
   - Click **New** -> **Blueprint**.
   - Connect your GitHub repository.
3. **Configure Blueprint Settings**:
   - Render will automatically read the `render.yaml` file from the root of your repository.
   - It will suggest creating two web services:
     1. `querygen-backend` (FastAPI Docker web service)
     2. `querygen-frontend` (Static React/Vite web service)
4. **Configure Environment Secrets**:
   - Provide the requested secret environment variables when prompted by Render:
     - `GROQ_API_KEY`: Your real Groq API key.
     - `GEMINI_API_KEY`: Your optional real Gemini API key.
     - `DATABASE_URL`: Your production Neon PostgreSQL connection URL.
     - `QDRANT_URL`: Your Qdrant Cloud cluster URL.
     - `QDRANT_API_KEY`: Your Qdrant Cloud cluster API key.
5. **Set Frontend URL Configuration**:
   - After creating the services, copy the URL of your backend web service (e.g., `https://querygen-backend.onrender.com`).
   - Paste it as the value of `VITE_API_BASE_URL` in the environment settings of the `querygen-frontend` static service.
6. **Deploy Blueprint**: Click **Apply** or **Deploy**. Render will build and deploy both services automatically!

---

## Option B: Deploying with Docker Compose

To run the containerized backend locally or on a custom host/VPS:

1. Copy `.env.example` to `.env` and fill in your actual production values.
2. Build and launch the containers:
   ```bash
   docker compose up -d --build
   ```
3. The API server starts on port `8000`.
