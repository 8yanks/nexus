import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Pull heavy modules out of the entry chunk into their own
        // bundles. The entry was at ~252 KB pre-split because the
        // Zustand store imports analytics + correlation + patterns +
        // backtest types + provider registry eagerly. Most of those
        // are only needed AFTER the user clicks into Detail / Backtest
        // / Correlation, so splitting them defers the cost.
        //
        // Browsers parallelise chunk fetches, so a smaller entry +
        // separate analytics chunk loads faster on first paint than
        // a single fat entry.
        manualChunks: (id) => {
          if (id.includes('/src/analytics/')) return 'analytics'
          if (id.includes('/src/quality/') || id.includes('/src/normalization/')) return 'analytics'
          if (id.includes('/src/backtest/')) return 'backtest-engine'
          if (id.includes('/src/audit/')) return 'audit'
          if (id.includes('/src/ai/')) return 'ai-orchestrator'
          if (id.includes('/src/sentinel/')) return 'sentinel-engine'
        },
      },
    },
  },
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
      { find: '@nexus/sentinel', replacement: resolve(__dirname, 'apps/sentinel/src') },
      { find: '@nexus/trader', replacement: resolve(__dirname, 'apps/trader/src') },
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
