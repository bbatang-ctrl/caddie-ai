import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      // Externalize all Capacitor packages — they're only available in native builds
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
