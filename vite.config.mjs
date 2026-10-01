import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Rutas relativas en el build: Electron carga dist/index.html con el
  // protocolo file://, y con rutas absolutas ("/assets/...") el navegador
  // las buscaría en la raíz del disco en vez de junto al index.html.
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    port: 5174
  }
});
