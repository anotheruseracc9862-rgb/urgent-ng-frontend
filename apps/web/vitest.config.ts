import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.config.*',
        '**/*.d.ts',
        '**/dist/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@urgent/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@urgent/utils': path.resolve(__dirname, '../../packages/utils/src'),
      '@urgent/api-client': path.resolve(__dirname, '../../packages/api-client/src'),
    },
  },
});
