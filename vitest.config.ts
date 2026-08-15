import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.tsx'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      reporter: ['text', 'json-summary'],
      thresholds: {
        branches: 75,
        functions: 85,
        lines: 85,
        statements: 80,
      },
    },
  },
})
