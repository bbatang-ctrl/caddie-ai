import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  esbuild: {
    // Use jsx transform which handles regex in JSX more reliably
    jsx: 'automatic',
    target: 'es2020',
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 3000,
    target: 'es2020',
    rollupOptions: {
      external: (id) => id.startsWith('@capacitor') || id.startsWith('@capacitor-community'),
      output: {
        manualChunks: {
          maplibre: ['maplibre-gl'],
          vendor:   ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  base: './',
  server: { port: 5173, host: true },
  optimizeDeps: { include: ['maplibre-gl', 'lucide-react'] },
})
