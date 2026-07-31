import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'stores/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@tauri-apps/plugin-store': path.resolve(__dirname, 'lib/tauri-shim/store.ts'),
      '@tauri-apps/plugin-fs': path.resolve(__dirname, 'lib/tauri-shim/fs.ts'),
      '@tauri-apps/plugin-fs/*': path.resolve(__dirname, 'lib/tauri-shim/fs.ts'),
      '@tauri-apps/plugin-dialog': path.resolve(__dirname, 'lib/tauri-shim/dialog.ts'),
      '@tauri-apps/api/path': path.resolve(__dirname, 'lib/tauri-shim/path.ts'),
      '@tauri-apps/api/core': path.resolve(__dirname, 'lib/tauri-shim/stubs.ts'),
      '@tauri-apps/api/event': path.resolve(__dirname, 'lib/tauri-shim/stubs.ts'),
      '@tauri-apps/api/webviewWindow': path.resolve(__dirname, 'lib/tauri-shim/stubs.ts'),
      '@tauri-apps/api/app': path.resolve(__dirname, 'lib/tauri-shim/stubs.ts'),
      '@tauri-apps/api/window': path.resolve(__dirname, 'lib/tauri-shim/stubs.ts'),
    },
  },
});
