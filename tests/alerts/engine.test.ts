import { describe, it, expect } from 'vitest'
import { evaluateRule, evaluateAllRules } from '@/alerts/engine'
import type { AlertRule, MarketSnapshot } from '@/types'
import type { AnalyticsResult } from '@/analytics/indicators'

// ─── HELPERS ──────────────────────────────────────────────

const mkRule = (overrides: Partial<AlertRule> = {}): AlertRule => ({
  id: 'test_rule_1',
  instrumentId: 'BTC-USD-SPOT',
  type: 'price_above',
  value: 70000,
  active: true,
  triggered: false,
  severity: 'warning',
  triggeredAt: null,
  ...overrides,
})

const mkSnap = (overrides: Partial<MarketSnapshot> = {}): MarketSnapshot => ({
  instrumentId: 'BTC-USD-SPOT',
  price: 68000,
  bid: 67990,
  ask: 68010,
  spread: 20,
  spreadBps: 2.94,
  change24h: 500,
  change24hPct: 0.0074,
  high24h: 69000,
  low24h: 66000,
  volume24h: 500_000_000,
  openInterest: null,
  fundingRate: 0.0002,
  nextFunding: null,
  liquidations24h: null,
  vwap: null,
  _source: 'test',
  _status: 'LIVE',
  _provenance: { source: 'test', fetchMethod: 'mock', latencyMs: 5, timestamp: new Date().toISOString(), receivedAt: new Date().toISOString() },
  _quality: { completeness: 1, timeliness: 1, accuracy: 1, consistency: 1 },
  ...overrides,
})

const mkAnalytics = (overrides: Partial<AnalyticsResult> = {}): AnalyticsResult => ({
  rsi: 55,
  ema20: 67500,
  ema50: 66000,
  sma20: 67200,
  bollinger: { upper: 70000, middle: 67500, lower: 65000, bandwidth: 0.074 },
  atr: 800,
  volumeAvg20: 450_000_000,
  relativeVolume: 1.1,
  ...overrides,
})

// ─── TESTS ────────────────────────────────────────────────

describe('Alert Engine — evaluateRule', () => {
  it('triggers price_above when price exceeds value', () => {
    const rule = mkRule({ type: 'price_above', value: 67000 })
    const result = evaluateRule(rule, mkSnap({ price: 68000 }), null)
    expect(result.triggered).toBe(true)
    expect(result.currentValue).toBe(68000)
  })

  it('does not trigger price_above when price is below', () => {
    const rule = mkRule({ type: 'price_above', value: 70000 })
    const result = evaluateRule(rule, mkSnap({ price: 68000 }), null)
    expect(result.triggered).toBe(false)
  })

  it('triggers price_below when price is under value', () => {
    const rule = mkRule({ type: 'price_below', value: 69000 })
    const result = evaluateRule(rule, mkSnap({ price: 68000 }), null)
    expect(result.triggered).toBe(true)
  })

  it('does not trigger price_below when price is above', () => {
    const rule = mkRule({ type: 'price_below', value: 60000 })
    const result = evaluateRule(rule, mkSnap({ price: 68000 }), null)
    expect(result.triggered).toBe(false)
  })

  it('triggers rsi_overbought when RSI exceeds threshold', () => {
    const rule = mkRule({ type: 'rsi_overbought', value: 70 })
    const result = evaluateRule(rule, mkSnap(), mkAnalytics({ rsi: 75 }))
    expect(result.triggered).toBe(true)
    expect(result.currentValue).toBe(75)
  })

  it('does not trigger rsi_overbought when RSI is below', () => {
    const rule = mkRule({ type: 'rsi_overbought', value: 70 })
    const result = evaluateRule(rule, mkSnap(), mkAnalytics({ rsi: 55 }))
    expect(result.triggered).toBe(false)
  })

  it('triggers rsi_oversold when RSI is below threshold', () => {
    const rule = mkRule({ type: 'rsi_oversold', value: 30 })
    const result = evaluateRule(rule, mkSnap(), mkAnalytics({ rsi: 22 }))
    expect(result.triggered).toBe(true)
  })

  it('triggers funding_extreme when |fundingRate| exceeds value', () => {
    const rule = mkRule({ type: 'funding_extreme', value: 0.0003 })
    const result = evaluateRule(rule, mkSnap({ fundingRate: -0.0005 }), null)
    expect(result.triggered).toBe(true)
  })

  it('does not trigger funding_extreme for normal rate', () => {
    const rule = mkRule({ type: 'funding_extreme', value: 0.0003 })
    const result = evaluateRule(rule, mkSnap({ fundingRate: 0.0001 }), null)
    expect(result.triggered).toBe(false)
  })

  it('triggers volume_spike when relativeVolume exceeds value', () => {
    const rule = mkRule({ type: 'volume_spike', value: 2.0 })
    const result = evaluateRule(rule, mkSnap(), mkAnalytics({ relativeVolume: 3.5 }))
    expect(result.triggered).toBe(true)
  })

  it('triggers bb_squeeze when bandwidth is below value', () => {
    const rule = mkRule({ type: 'bb_squeeze', value: 0.02 })
    const result = evaluateRule(rule, mkSnap(), mkAnalytics({
      bollinger: { upper: 68200, middle: 68000, lower: 67800, bandwidth: 0.005 },
    }))
    expect(result.triggered).toBe(true)
  })

  it('does not trigger when rule is inactive', () => {
    const rule = mkRule({ type: 'price_above', value: 1, active: false })
    const result = evaluateRule(rule, mkSnap({ price: 68000 }), null)
    expect(result.triggered).toBe(false)
  })

  it('returns null currentValue when analytics missing for RSI rule', () => {
    const rule = mkRule({ type: 'rsi_overbought', value: 70 })
    const result = evaluateRule(rule, mkSnap(), null)
    expect(result.currentValue).toBeNull()
    expect(result.triggered).toBe(false)
  })
})

describe('Alert Engine — evaluateAllRules', () => {
  it('evaluates only rules matching snapshot instrumentId', () => {
    const rules = [
      mkRule({ id: '1', instrumentId: 'BTC-USD-SPOT', type: 'price_above', value: 67000 }),
      mkRule({ id: '2', instrumentId: 'ETH-USD-SPOT', type: 'price_above', value: 2000 }),
    ]
    const results = evaluateAllRules(rules, mkSnap({ instrumentId: 'BTC-USD-SPOT', price: 68000 }), null)
    expect(results).toHaveLength(1)
    expect(results[0].rule.id).toBe('1')
    expect(results[0].triggered).toBe(true)
  })

  it('returns empty array when no rules match', () => {
    const rules = [mkRule({ instrumentId: 'AAPL' })]
    const results = evaluateAllRules(rules, mkSnap({ instrumentId: 'BTC-USD-SPOT' }), null)
    expect(results).toHaveLength(0)
  })
})
