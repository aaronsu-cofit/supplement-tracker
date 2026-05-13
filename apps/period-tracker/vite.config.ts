import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.VITE_PORT) || 5173,
    host: true,
    allowedHosts: true,
    proxy:
      process.env.VITE_ENABLE_PROXY === 'true'
        ? {
            '/api': {
              target: process.env.VITE_API_URL || 'http://localhost:4000',
              changeOrigin: true,
            },
          }
        : undefined,
  },
})
