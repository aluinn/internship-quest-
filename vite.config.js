// Vite is the tool that serves the front end while you develop and bundles it for `npm start`.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The browser talks to Vite; anything starting with /api is passed on to
    // our own server (server/index.js), which owns the save file.
    proxy: { '/api': 'http://127.0.0.1:3001' },
  },
});
