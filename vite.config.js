import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Garantir une seule instance de React dans toute l'app
    // Empêche les conflits entre preact/compat (posthog-js) et React
    dedupe: ['react', 'react-dom'],
    alias: {
      react: path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom'),
    },
  },
  optimizeDeps: {
    // Forcer le pré-bundling de ces dépendances pour éviter les problèmes ESM/CJS
    include: ['react', 'react-dom', 'react-router-dom', '@sentry/react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['framer-motion', 'lucide-react'],
          charts: ['recharts'],
          stripe: ['@stripe/react-stripe-js', '@stripe/stripe-js'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
    target: 'es2020',
    chunkSizeWarningLimit: 500,
  },
  server: {
    port: 3000,
  },
});
