import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 20000,
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/unit/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  },
});
