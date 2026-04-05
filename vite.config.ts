import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // Specific package aliases (must come before wildcard)
      { find: '@/types', replacement: resolve(__dirname, 'packages/shared-types/src') },
      { find: '@/utils', replacement: resolve(__dirname, 'packages/shared-utils/src') },
      { find: '@/signals/types', replacement: resolve(__dirname, 'packages/shared-signals/src/types') },
      { find: '@/providers/base', replacement: resolve(__dirname, 'packages/shared-clients/src/base') },
      { find: '@nexus/shared-types', replacement: resolve(__dirname, 'packages/shared-types/src') },
      { find: '@nexus/shared-utils', replacement: resolve(__dirname, 'packages/shared-utils/src') },
      { find: '@nexus/shared-signals', replacement: resolve(__dirname, 'packages/shared-signals/src') },
      { find: '@nexus/shared-clients', replacement: resolve(__dirname, 'packages/shared-clients/src') },
      { find: '@nexus/shared-infra', replacement: resolve(__dirname, 'packages/shared-infra/src') },
      // Wildcard fallback
      { find: '@', replacement: resolve(__dirname, 'src') },
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
})
