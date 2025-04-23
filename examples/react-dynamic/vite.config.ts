import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@gelatomega/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
      '@gelatomega/react-dynamic': path.resolve(
        __dirname,
        '../../packages/react-dynamic/src/index.ts',
      ),
    },
  },
  optimizeDeps: {
    include: ['@gelatomega/core', '@gelatomega/react-dynamic'],
  },
});
