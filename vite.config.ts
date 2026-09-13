import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// On GitHub Pages the site lives under /<repo-name>/. The deploy workflow sets
// BASE_PATH to that value; local dev and preview use "/".
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
