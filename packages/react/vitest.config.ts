import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@samirdamle/nano-charts': path.resolve(__dirname, '../core/src/index.ts') },
  },
  test: { environment: 'jsdom', include: ['tests/**/*.test.tsx'] },
  esbuild: { jsx: 'automatic' },
});
