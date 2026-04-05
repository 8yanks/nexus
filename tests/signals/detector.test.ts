import { describe, it, expect } from 'vitest'
import { detectSignals } from '@/signals/detector'
import type { AnalyticsResult, BollingerBands } from '@/analytics/indicators'
import type { StructureResult } from '@/analytics/structure'

// ─── HELPERS ────────────────────────────────────────────────

const mkAnalytics = (overrides: Partial<AnalyticsResult> = {}): AnalyticsResult => ({
  ema20: 100,
  ema50: 98,
  ema200: 95,
  rsi: 50,
  atr: 2,
  vwap: 100,
  bollinger: { upper: 105, middle: 100, lower: 95, bandwidth: 0.1 },
  donchian: { upper: 106, middle: 100, lower: 94 },
  zScore: 0,
  relativeVolume: 1,
  _source: 'test',
  computedAt: new Date().toISOString(),
  ...overrides,
})

// ─── RSI SIGNALS ────────────────────────────────────────────

describe('RSI signals', () => {
  it('detects RSI_OVERSOLD when RSI < 30', () => {
    const a = mkAnalytics({ rsi: 22 })
    const signals = detectSignals('BTC-USD-SPOT', 67000, a, null, null)
    expect(signals.some((s) => s.type === 'RSI_OVERSOLD')).toBe(true)
  })

  it('detects RSI_OVERBOUGHT when RSI > 70', () => {
    const a = mkAnalytics({ rsi: 78 })
    const signals = detectSignals('BTC-USD-SPOT', 67000, a, null, null)
    expect(signals.some((s) => s.type === 'RSI_OVERBOUGHT')).toBe(true)
  })

  it('no RSI signal when 30 < RSI < 70', () => {
    const a = mkAnalytics({ rsi: 55 })
    const signals = detectSignals('BTC-USD-SPOT', 67000, a, null, null)
    expect(signals.some((s) => s.type === 'RSI_OVERSOLD')).toBe(false)
    expect(signals.some((s) => s.type === 'RSI_OVERBOUGHT')).toBe(false)
  })
})

// ─── BOLLINGER SIGNALS ──────────────────────────────────────

describe('Bollinger signals', () => {
  it('detects BB_SQUEEZE when bandwidth < 2%', () => {
    const bb: BollingerBands = { upper: 101, middle: 100, lower: 99, bandwidth: 0.015 }
    const a = mkAnalytics({ bollinger: bb })
    const signals = detectSignals('BTC-USD-SPOT', 100, a, null, null)
    expect(signals.some((s) => s.type === 'BB_SQUEEZE')).toBe(true)
  })

  it('detects BB_BREAKOUT_UP when price > upper', () => {
    const bb: BollingerBands = { upper: 105, middle: 100, lower: 95, bandwidth: 0.1 }
    const a = mkAnalytics({ bollinger: bb })
    const signals = detectSignals('BTC-USD-SPOT', 106, a, null, null)
    expect(signals.some((s) => s.type === 'BB_BREAKOUT_UP')).toBe(true)
  })

  it('detects BB_BREAKOUT_DOWN when price < lower', () => {
    const bb: BollingerBands = { upper: 105, middle: 100, lower: 95, bandwidth: 0.1 }
    const a = mkAnalytics({ bollinger: bb })
    const signals = detectSignals('BTC-USD-SPOT', 94, a, null, null)
    expect(signals.some((s) => s.type === 'BB_BREAKOUT_DOWN')).toBe(true)
  })
})

// ─── VOLUME SIGNALS ─────────────────────────────────────────

describe('Volume signals', () => {
  it('detects HIGH_VOLUME when relativeVolume > 2.5', () => {
    const a = mkAnalytics({ relativeVolume: 3.2 })
    const signals = detectSignals('BTC-USD-SPOT', 67000, a, null, null)
    expect(signals.some((s) => s.type === 'HIGH_VOLUME')).toBe(true)
  })

  it('no HIGH_VOLUME when relativeVolume < 2.5', () => {
    const a = mkAnalytics({ relativeVolume: 1.5 })
    const signals = detectSignals('BTC-USD-SPOT', 67000, a, null, null)
    expect(signals.some((s) => s.type === 'HIGH_VOLUME')).toBe(false)
  })
})

// ─── EMA CROSS SIGNALS ─────────────────────────────────────

describe('EMA cross signals', () => {
  it('detects EMA_CROSS_BULL when 20 crosses above 50', () => {
    const prev = mkAnalytics({ ema20: 98, ema50: 100 })
    const curr = mkAnalytics({ ema20: 101, ema50: 100 })
    const signals = detectSignals('BTC-USD-SPOT', 101, curr, null, prev)
    expect(signals.some((s) => s.type === 'EMA_CROSS_BULL')).toBe(true)
  })

  it('detects EMA_CROSS_BEAR when 20 crosses below 50', () => {
    const prev = mkAnalytics({ ema20: 101, ema50: 100 })
    const curr = mkAnalytics({ ema20: 99, ema50: 100 })
    const signals = detectSignals('BTC-USD-SPOT', 99, curr, null, prev)
    expect(signals.some((s) => s.type === 'EMA_CROSS_BEAR')).toBe(true)
  })

  it('no cross signal when no previous analytics', () => {
    const curr = mkAnalytics({ ema20: 101, ema50: 100 })
    const signals = detectSignals('BTC-USD-SPOT', 101, curr, null, null)
    expect(signals.some((s) => s.type === 'EMA_CROSS_BULL')).toBe(false)
    expect(signals.some((s) => s.type === 'EMA_CROSS_BEAR')).toBe(false)
  })
})

// ─── STRUCTURE SIGNALS ──────────────────────────────────────

describe('Structure signals', () => {
  it('detects STRUCT_BULL for bullish structure', () => {
    const structure: StructureResult = {
      pivots: [],
      trend: 'bullish',
      lastHigh: 110,
      lastLow: 95,
    }
    const a = mkAnalytics()
    const signals = detectSignals('BTC-USD-SPOT', 100, a, structure, null)
    expect(signals.some((s) => s.type === 'STRUCT_BULL')).toBe(true)
  })

  it('detects STRUCT_BEAR for bearish structure', () => {
    const structure: StructureResult = {
      pivots: [],
      trend: 'bearish',
      lastHigh: 105,
      lastLow: 90,
    }
    const a = mkAnalytics()
    const signals = detectSignals('BTC-USD-SPOT', 100, a, structure, null)
    expect(signals.some((s) => s.type === 'STRUCT_BEAR')).toBe(true)
  })

  it('no structure signal for neutral trend', () => {
    const structure: StructureResult = {
      pivots: [],
      trend: 'neutral',
      lastHigh: 105,
      lastLow: 95,
    }
    const a = mkAnalytics()
    const signals = detectSignals('BTC-USD-SPOT', 100, a, structure, null)
    expect(signals.some((s) => s.type === 'STRUCT_BULL')).toBe(false)
    expect(signals.some((s) => s.type === 'STRUCT_BEAR')).toBe(false)
  })
})

// ─── SIGNAL METADATA ────────────────────────────────────────

describe('Signal metadata', () => {
  it('all signals have required fields', () => {
    const a = mkAnalytics({ rsi: 20, relativeVolume: 3 })
    const signals = detectSignals('BTC-USD-SPOT', 67000, a, null, null)
    for (const s of signals) {
      expect(s.id).toBeTruthy()
      expect(s.instrumentId).toBe('BTC-USD-SPOT')
      expect(s._source).toBe('signal_detector')
      expect(s._status).toBe('SIMULATED')
      expect(s.price).toBe(67000)
      expect(s.strength).toBeGreaterThanOrEqual(0)
      expect(s.strength).toBeLessThanOrEqual(1)
      expect(s.timestamp).toBeTruthy()
    }
  })
})
