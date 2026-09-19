import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  esbuild: {
    // tsconfig keeps "jsx": "preserve" for Next; tests need the automatic runtime.
    jsx: 'automatic',
  },
  test: {
    // dt-sql-parser (ANTLR-based) is lazy-loaded on the first AST cross-check; that
    // one-time cold-load can exceed vitest's default 5s timeout in CI.
    testTimeout: 30000,
    environment: 'jsdom',
    setupFiles: ['./tests/utils/test-setup.ts'],
  },
});
