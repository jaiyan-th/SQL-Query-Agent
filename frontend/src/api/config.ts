/**
 * Dynamically resolves the API base URL for QueryGen AI.
 * 
 * Rules:
 * 1. If VITE_API_BASE_URL is explicitly set in env, use it.
 * 2. In local development (DEV), default to 'http://localhost:8000' to leverage Vite's dev server proxy or hit direct backend.
 * 3. In production (PROD), check if we are deployed on Render (hostname contains 'querygen-frontend').
 *    If yes, dynamically point to the matching backend service ('querygen-backend').
 *    Otherwise, default to relative paths ('') to support unified single-container deployment.
 */

let defaultApiBase = '';

if (import.meta.env.DEV) {
  defaultApiBase = 'http://localhost:8000';
} else if (typeof window !== 'undefined') {
  const hostname = window.location.hostname;
  if (hostname.includes('querygen-frontend')) {
    // If the frontend URL is e.g. https://querygen-frontend-123.onrender.com,
    // point to the matching backend service URL: https://querygen-backend-123.onrender.com
    defaultApiBase = window.location.origin.replace('querygen-frontend', 'querygen-backend');
  }
}

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || defaultApiBase;
