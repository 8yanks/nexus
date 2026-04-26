import { test, expect } from '@playwright/test'

// ─── E2E SMOKE TEST ─────────────────────────────────────────
//
// Bare-minimum end-to-end: the production build serves successfully,
// the React app boots, the splash dismisses, and core navigation
// reaches the screens that matter (Dashboard, Detail, Backtest).
//
// On purpose this does NOT exercise:
// - real WebSocket connections to Binance/Coinbase (network flakes
//   would dominate signal-to-noise — covered by unit + integration
//   tests with mocks)
// - AI provider calls (no keys in CI)
// - drag/drop or scroll interactions on the chart canvas (jsdom
//   already covers what's testable; pixel-level chart interaction is
//   visual-regression territory)
//
// What this DOES guarantee: the deployed bundle isn't broken at the
// level where the app fails to mount. That alone is worth a CI step.

const dismissSplash = async (page: import('@playwright/test').Page) => {
  // The DemoSplash modal is shown on first visit per session. Look
  // for a "got it" / dismiss control and click if present, otherwise
  // skip silently — splash may be auto-dismissed in some scenarios.
  const dismiss = page.getByRole('button', { name: /got it|dismiss|continue|fermer|continuer/i })
  if (await dismiss.isVisible({ timeout: 2000 }).catch(() => false)) {
    await dismiss.click()
  }
}

test.describe('NEXUS — smoke', () => {
  test('app boots and renders the Dashboard', async ({ page }) => {
    await page.goto('/')
    await dismissSplash(page)
    // Sidebar exists with the navigation items.
    await expect(page.getByRole('navigation')).toBeVisible()
    // PAPER TRADING badge is always-on in the TopBar.
    await expect(page.getByText(/PAPER TRADING/i)).toBeVisible()
  })

  test('Sidebar nav reaches Backtest screen', async ({ page }) => {
    await page.goto('/')
    await dismissSplash(page)
    // Click "Backtest" in the sidebar.
    await page.getByRole('button', { name: /backtest/i }).click()
    // Header renders.
    await expect(page.getByRole('heading', { name: /Backtest Engine/i })).toBeVisible()
    // Run button is present (the dev hasn't run a backtest yet, so the
    // results panel is the empty state).
    await expect(page.getByRole('button', { name: /Run Backtest/i })).toBeVisible()
  })

  test('Dashboard → Detail navigation works on a watchlist row', async ({ page }) => {
    await page.goto('/')
    await dismissSplash(page)
    // The dashboard has a watchlist with at least one row. Find any
    // row containing a known instrument (BTC) and double-click to drill in.
    const btcRow = page.getByRole('row').filter({ hasText: /BTC/ }).first()
    await btcRow.dblclick()
    // Detail screen header carries an h1 with the instrument symbol.
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/BTC/)
    // The chart toolbar should expose the timeframe picker.
    await expect(page.getByTestId('detail-tf-picker')).toBeVisible()
  })

  test('NotFinancialAdviceBanner shows on ChainMonitor', async ({ page }) => {
    await page.goto('/')
    await dismissSplash(page)
    await page.getByRole('button', { name: /chain/i }).click()
    // Banner is mounted.
    await expect(page.getByTestId('nfa-banner')).toBeVisible()
    await expect(page.getByText(/NOT FINANCIAL ADVICE/i)).toBeVisible()
  })
})
