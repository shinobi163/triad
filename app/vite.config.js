import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset paths, so the build works at any address (e.g. GitHub Pages' /triad/).
  base: './',
  // Each game's rules engine and puzzles live in its own folder one level up.
  server: { fs: { allow: ['..'] } },
});
