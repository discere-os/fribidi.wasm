import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'build/**',
        'test/**',
        'src/ts/benchmark.ts',
        '**/*.d.ts'
      ]
    },
    include: [
      'test/**/*.{test,spec}.{js,ts}'
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'build/**'
    ]
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});