import { defineConfig, devices } from '@playwright/test'

// ─── PLAYWRIGHT CONFIG ──────────────────────────────────────
//
// E2E baseline. Spawns the production-like preview server (`vite
// preview` against a fresh build), runs the spec(s) in `e2e/`, and
// tears down. Vitest stays on its own — these don't share runners.
//
// Browser scope kept tight on purpose:
// - Chromium only by default (the most common rendering target).
//   Cross-browser is a Sprint 2+ concern.
// - Mobile viewports excluded for now (the dashboard is desktop-first).
//
// To extend: add additional `projects` entries below and re-enable
// `browser install` in CI.

export default defineConfig({
  testDir: './e2e',
  // Single retry locally (network flake), 2 in CI.
  retries: process.env.CI ? 2 : 1,
  // No parallel by default — the preview server is single-tab safe
  // but the IndexedDB shared origin would race across workers.
  workers: 1,
  fullyParallel: false,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    // Trace on retry only — full trace per run blows up the artifact size.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Spawn `vite preview` automatically. The `reuseExistingServer` flag
  // means devs can also run `npm run preview` separately and the tests
  // will reuse it.
  webServer: {
    command: 'npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
