import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
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
