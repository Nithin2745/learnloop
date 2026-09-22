import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The /api proxy lets the frontend call the backend on the same origin in
// dev (no CORS dance). Point it elsewhere with VITE_API_BASE_URL in prod.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
