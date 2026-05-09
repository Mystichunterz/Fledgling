import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: false },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        workbench: 'workbench.html',
      },
      output: {
        manualChunks: { phaser: ['phaser'] },
      },
    },
  },
});
