import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // puzzles.json lives next to the generator in ../crossfire
  server: { fs: { allow: ['..'] } },
});
