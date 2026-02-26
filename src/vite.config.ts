import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api/registry': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/o': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/files': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
});
