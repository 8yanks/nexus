import { test, expect } from '@playwright/test'

// ─── E2E — backtest flow ────────────────────────────────────
//
// Extends the smoke baseline. Drives the actual user journey:
// Backtest → Run → Results → "view on chart" → Detail with markers.
// This spec is what catches a regression that breaks the full
// pipeline even when each unit/integration test still passes.
//
// We rely on the in-store mock provider (Binance/Coinbase aren't
// reachable in CI without keys + the WS connections would flake).
// The 5s store refresh interval needs ~10s to seed enough candles
// for the backtest engine to find ≥30 bars.

const dismissSplash = async (page: import('@playwright/test').Page) => {
  const dismiss = page.getByRole('button', { name: /got it|dismiss|continue|fermer|continuer/i })
  if (await dismiss.isVisible({ timeout: 2000 }).catch(() => false)) {
    await dismiss.click()
  }
}

const dismissCookieBanner = async (page: import('@playwright/test').Page) => {
  const banner = page.getByTestId('cookie-consent-banner')
  if (await banner.isVisible({ timeout: 1000 }).catch(() => false)) {
    await page.getByTestId('cookie-consent-decline').click()
  }
}

test.describe('NEXUS — backtest flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await dismissSplash(page)
    await dismissCookieBanner(page)
  })

  test('Backtest screen loads with default config + idle badge', async ({ page }) => {
    await page.getByRole('button', { name: /backtest/i }).click()
    await expect(page.getByRole('heading', { name: /Backtest Engine/i })).toBeVisible()
    await expect(page.getByTestId('backtest-state-badge')).toContainText(/idle/i)
    await expect(page.getByRole('button', { name: /Run Backtest/i })).toBeVisible()
  })

  test('Running a backtest produces a results panel with stats', async ({ page }) => {
    await page.getByRole('button', { name: /backtest/i }).click()

    // Wait for the store to seed enough candles. The mock provider
    // generates candles synchronously per refresh tick; 12s gives
    // 2-3 ticks of headroom.
    await page.waitForTimeout(12_000)

    await page.getByRole('button', { name: /Run Backtest/i }).click()

    // Wait for results — the engine is synchronous after the setTimeout(0)
    // unwrap, so this should land in <1s.
    await expect(page.getByTestId('backtest-state-badge')).not.toContainText(/idle/i, {
      timeout: 5_000,
    })
    // The Results panel header is "Results" — look for the trade count badge.
    await expect(page.getByText(/Net Profit/i)).toBeVisible()
  })

  test('"view on chart" button (post-run) jumps to Detail', async ({ page }) => {
    await page.getByRole('button', { name: /backtest/i }).click()
    await page.waitForTimeout(12_000)
    await page.getByRole('button', { name: /Run Backtest/i }).click()

    // Wait for results.
    await expect(page.getByTestId('backtest-view-on-chart')).toBeVisible({ timeout: 5_000 })
    await page.getByTestId('backtest-view-on-chart').click()

    // Detail screen should mount with the same instrument.
    await expect(page.getByTestId('detail-tf-picker')).toBeVisible()
  })
})
