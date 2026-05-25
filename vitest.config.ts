import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

/**
 * Vitest config — pure-function unit tests only (no DOM yet). We deliberately
 * narrow `include` so server-only modules can't drag the whole Next stack
 * into the test runner.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/**/index.ts', '**/*.d.ts'],
    },
  },
});
