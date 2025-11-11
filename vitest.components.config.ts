import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/test/components/**/*.test.{ts,tsx}'],
    exclude: [
      'node_modules/',
      'dist/',
      'build/',
      'electron/',
      'server/',
      'src/test/**/*.{spec,test}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});