import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // GitHub Pages base path - update if deploying to a project repo
  // Use '/' for user pages, or '/repo-name/' for project repos
  base: process.env.VITE_BASE_PATH || '/',

  plugins: [react()],

  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild'
  },

  server: {
    port: 5173,
    proxy: {
      // Proxy /vessel/:imo -> external VMS API (bypass CORS during development)
      '^/vessel/.*': {
        target: 'https://vms-data-processing-jgjm9r.5sc6y6-4.usa-e2.cloudhub.io',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/vessel/, '/api/vessel')
      },
      // Proxy /api/arrivals/* -> local Express server (during development)
      // In production (Vercel), /api/* automatically routes to serverless functions
      '^/api/arrivals/.*': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})