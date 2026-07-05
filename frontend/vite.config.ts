import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // In development, proxy /api to local backend.
  // In production, VITE_API_BASE_URL is used directly in the app code.
  const apiTarget = env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (path) => path
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: false  // Disable sourcemaps in production for security
    }
  }
})
