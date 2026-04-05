import { describe, it, expect } from 'vitest'
import { assessQuality } from '@/quality/scoring'
import type { Instrument, MarketSnapshot, DataProvenance, DataQualityMetrics } from '@/types'

// ─── HELPERS ────────────────────────────────────────────────

const mkInstrument = (
  overrides: Partial<Instrument> = {},
): Instrument => ({
  id: 'BTC-USD-SPOT',
  symbol: 'BTC/USD',
  name: 'Bitcoin',
  assetClass: 'crypto_spot',
  exchange: 'Binance',
  baseCurrency: 'BTC',
  quoteCurrency: 'USD',
  contractType: null,
  tickSize: 0.01,
  lotSize: 1,
  metadata: { listingDate: '2020-01-01', sector: null },
  ...overrides,
})

const mkProvenance = (overrides: Partial<DataProvenance> = {}): DataProvenance => ({
  source: 'test',
  fetchMethod: 'mock',
  latencyMs: 100,
  timestamp: new Date().toISOString(),
  receivedAt: new Date().toISOString(),
  ...overrides,
})

const mkQuality = (overrides: Partial<DataQualityMetrics> = {}): DataQualityMetrics => ({
  completeness: 1,
  timeliness: 1,
  accuracy: 0,
  consistency: 1,
  ...overrides,
})

const mkSnapshot = (
  overrides: Partial<MarketSnapshot> = {},
): MarketSnapshot => ({
  instrumentId: 'BTC-USD-SPOT',
  price: 67000,
  bid: 66999,
  ask: 67001,
  spread: 2,
  spreadBps: 0.3,
  change24h: 0.02,
  change24hPct: 2,
  high24h: 68000,
  low24h: 66000,
  volume24h: 1e9,
  openInterest: 5e9,
  fundingRate: null,
  nextFunding: null,
  liquidations24h: 1e6,
  vwap: null,
  _source: 'test',
  _status: 'LIVE',
  _provenance: mkProvenance(),
  _quality: mkQuality(),
  ...overrides,
})

// ─── TESTS ──────────────────────────────────────────────────

describe('assessQuality', () => {
  it('returns high score for complete live data', () => {
    const inst = mkInstrument()
    const snap = mkSnapshot({ openInterest: 5e9 })
    const report = assessQuality(inst, snap)

    expect(report.completeness).toBe(1)
    expect(report.freshness).toBe(1) // latencyMs=100 < 500
    expect(report.reliability).toBe(0.95)
    expect(report.overallScore).toBeGreaterThan(0.9)
    expect(report.issues).toHaveLength(0)
    expect(report._source).toBe('quality_engine')
  })

  it('penalizes simulated data', () => {
    const inst = mkInstrument()
    const snap = mkSnapshot({ _status: 'SIMULATED' })
    const report = assessQuality(inst, snap)

    expect(report.freshness).toBe(0)
    expect(report.reliability).toBe(0)
    expect(report.overallScore).toBeLessThan(0.5)
    expect(report.issues).toContain('All data is SIMULATED — not from live market feed')
  })

  it('flags missing bid/ask', () => {
    const inst = mkInstrument()
    const snap = mkSnapshot({ bid: null, ask: null })
    const report = assessQuality(inst, snap)

    expect(report.completeness).toBeLessThan(1)
    expect(report.issues).toContain('Bid/Ask data missing')
  })

  it('flags missing open interest for crypto', () => {
    const inst = mkInstrument({ assetClass: 'crypto_spot' })
    const snap = mkSnapshot({ openInterest: null })
    const report = assessQuality(inst, snap)

    expect(report.issues).toContain('Open interest missing')
  })

  it('does not flag missing OI for non-crypto', () => {
    const inst = mkInstrument({ id: 'AAPL', assetClass: 'us_equity' })
    const snap = mkSnapshot({ instrumentId: 'AAPL', openInterest: null })
    const report = assessQuality(inst, snap)

    expect(report.issues).not.toContain('Open interest missing')
  })

  it('flags missing funding rate for crypto_perp', () => {
    const inst = mkInstrument({ assetClass: 'crypto_perp' })
    const snap = mkSnapshot({ fundingRate: null })
    const report = assessQuality(inst, snap)

    expect(report.issues).toContain('Funding rate missing')
  })

  it('reduces freshness for high latency', () => {
    const inst = mkInstrument()
    const snap = mkSnapshot({ _provenance: mkProvenance({ latencyMs: 3000 }) })
    const report = assessQuality(inst, snap)

    expect(report.freshness).toBe(0.3)
  })
})
