import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Rutas absolutas ("/assets/..."): Electron sirve dist/ con el esquema
  // propio app:// (ver electron/main.js), así que "/" es la carpeta dist.
  // Con rutas relativas ("./assets") las ventanas que abren otra ruta, como
  // /extraccion/imprimir/5, buscaban los archivos en
  // /extraccion/imprimir/assets/ y se quedaban en blanco.
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    port: 5174
  }
});
