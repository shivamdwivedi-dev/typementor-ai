import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  build: {
    // Phase 4: Manual chunk splitting to reduce initial bundle size
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — loaded first, cached aggressively
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Charting (heavy — only needed on Dashboard)
          'vendor-charts': ['recharts'],
          // PDF export (heavy — only needed on Academy)
          'vendor-pdf': ['jspdf'],
          // Icon library
          'vendor-icons': ['lucide-react'],
          // State management
          'vendor-state': ['zustand'],
        },
      },
    },
    // Raise warning threshold since charts/pdf are intentionally split
    chunkSizeWarningLimit: 600,
  },

  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});