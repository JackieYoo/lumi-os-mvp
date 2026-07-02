import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['server/tests/**/*.test.ts'],
    setupFiles: [],
    env: {
      JWT_SECRET: 'test-secret-must-be-at-least-32-characters-long',
      DATABASE_PATH: './data/test-lumi-mvp.db',
    },
  },
});
