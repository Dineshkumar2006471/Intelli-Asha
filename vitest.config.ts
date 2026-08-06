/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/tests/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/pages/**',
        'src/types/**',
        'src/App.tsx',
        'src/firebase.ts',
      ],
      thresholds: {
        statements: 40,
        branches: 40,
        functions: 35,
        lines: 40,
      },
    },
  },
});
