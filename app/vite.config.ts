import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// duas janelas = duas entradas; base relativa porque o app é servido de 127.0.0.1
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        controller: resolve(__dirname, 'controller.html'),
        output: resolve(__dirname, 'output.html'),
        slots: resolve(__dirname, 'slots.html')
      }
    }
  },
  server: { port: 5273, strictPort: true }
});
