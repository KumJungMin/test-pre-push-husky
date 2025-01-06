import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'], 
      reportsDirectory: './coverage', 
      include: ['project/**/*.{ts,tsx,js,jsx}'],
    },
  },
})
