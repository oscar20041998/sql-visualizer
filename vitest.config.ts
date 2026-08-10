import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // dt-sql-parser (ANTLR-based) is lazy-loaded on the first AST cross-check; that
    // one-time cold-load can exceed vitest's default 5s timeout in CI.
    testTimeout: 30000,
  },
});
