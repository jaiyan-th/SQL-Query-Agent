# ============================================================
# QueryGen AI — Frontend Production Dockerfile
# React 18 + TypeScript + Vite → nginx
# ============================================================

# Stage 1: Build the React app
FROM node:18-alpine AS builder

WORKDIR /app

# Declare build argument for the backend API URL.
# Vite bakes VITE_* variables into the bundle at build time.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Install dependencies (uses package-lock.json for deterministic builds)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config (handles SPA routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
