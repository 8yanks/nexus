import { describe, it, expect } from 'vitest'
import {
  configureFreqtrade,
  getFreqtradeConfig,
  getFreqtradeStatus,
  checkConnection,
  submitOrder,
  getOpenTrades,
  isDryRun,
} from '../../apps/trader/src/freqtrade-bridge'

describe('Freqtrade Bridge', () => {
  it('returns default config', () => {
    const cfg = getFreqtradeConfig()
    expect(cfg.apiUrl).toBe('http://localhost:8080')
    expect(cfg.dryRun).toBe(true)
    expect(cfg.stakeCurrency).toBe('USDT')
  })

  it('configureFreqtrade merges overrides', () => {
    const cfg = configureFreqtrade({ stakeAmount: 500, dryRun: true })
    expect(cfg.stakeAmount).toBe(500)
    expect(cfg.dryRun).toBe(true)
    // Reset
    configureFreqtrade({})
  })

  it('status starts as disconnected', () => {
    const status = getFreqtradeStatus()
    expect(status.connected).toBe(false)
    expect(status.version).toBeNull()
  })

  it('checkConnection returns disconnected (stub)', async () => {
    const status = await checkConnection()
    expect(status.connected).toBe(false)
    expect(status.lastUpdate).toBeTruthy()
  })

  it('submitOrder returns rejected order in dry-run', async () => {
    configureFreqtrade({ dryRun: true })
    const order = await submitOrder('BTC-USD', 'buy', 'sig_1')
    expect(order.status).toBe('rejected')
    expect(order.instrumentId).toBe('BTC-USD')
    expect(order.side).toBe('buy')
    expect(order.signalId).toBe('sig_1')
  })

  it('submitOrder throws when dryRun is false (safety)', async () => {
    configureFreqtrade({ dryRun: false })
    await expect(submitOrder('BTC-USD', 'buy', 'sig_1')).rejects.toThrow('SAFETY')
    // Reset
    configureFreqtrade({ dryRun: true })
  })

  it('getOpenTrades returns empty array (stub)', async () => {
    const trades = await getOpenTrades()
    expect(trades).toEqual([])
  })

  it('isDryRun returns true when config is dry-run', () => {
    configureFreqtrade({ dryRun: true })
    expect(isDryRun()).toBe(true)
  })
})
