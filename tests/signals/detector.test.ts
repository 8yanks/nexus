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
  // Default Donchian-breakout channel sits well outside typical
  // mid-range prices, so the breakout signal stays silent unless a
  // test explicitly overrides this field. Same shape as `donchian`.
  donchianBreakout: { upper: 110, middle: 100, lower: 90 },
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

// ─── DONCHIAN BREAKOUT SIGNALS ──────────────────────────────

describe('Donchian breakout signals', () => {
  it('detects DC_BREAKOUT_UP when price closes above the prior 20-bar high', () => {
    const a = mkAnalytics({ donchianBreakout: { upper: 100, middle: 95, lower: 90 } })
    const signals = detectSignals('BTC-USD-SPOT', 105, a, null, null)
    expect(signals.some((s) => s.type === 'DC_BREAKOUT_UP')).toBe(true)
  })

  it('detects DC_BREAKOUT_DOWN when price closes below the prior 20-bar low', () => {
    const a = mkAnalytics({ donchianBreakout: { upper: 100, middle: 95, lower: 90 } })
    const signals = detectSignals('BTC-USD-SPOT', 85, a, null, null)
    expect(signals.some((s) => s.type === 'DC_BREAKOUT_DOWN')).toBe(true)
  })

  it('no DC signal when price stays inside the prior range', () => {
    const a = mkAnalytics({ donchianBreakout: { upper: 100, middle: 95, lower: 90 } })
    const signals = detectSignals('BTC-USD-SPOT', 95, a, null, null)
    expect(signals.some((s) => s.type === 'DC_BREAKOUT_UP')).toBe(false)
    expect(signals.some((s) => s.type === 'DC_BREAKOUT_DOWN')).toBe(false)
  })

  it('no DC signal when donchianBreakout is null (insufficient history)', () => {
    const a = mkAnalytics({ donchianBreakout: null })
    const signals = detectSignals('BTC-USD-SPOT', 200, a, null, null)
    expect(signals.some((s) => s.type === 'DC_BREAKOUT_UP')).toBe(false)
    expect(signals.some((s) => s.type === 'DC_BREAKOUT_DOWN')).toBe(false)
  })

  it('signal carries the bullish/bearish direction from SIGNAL_CONFIGS', () => {
    const aUp = mkAnalytics({ donchianBreakout: { upper: 100, middle: 95, lower: 90 } })
    const aDown = mkAnalytics({ donchianBreakout: { upper: 100, middle: 95, lower: 90 } })
    const up = detectSignals('BTC-USD-SPOT', 105, aUp, null, null)
      .find((s) => s.type === 'DC_BREAKOUT_UP')!
    const down = detectSignals('BTC-USD-SPOT', 80, aDown, null, null)
      .find((s) => s.type === 'DC_BREAKOUT_DOWN')!
    expect(up.direction).toBe('bullish')
    expect(down.direction).toBe('bearish')
  })

  it('uses the current price field as the signal price', () => {
    const a = mkAnalytics({ donchianBreakout: { upper: 100, middle: 95, lower: 90 } })
    const sig = detectSignals('BTC-USD-SPOT', 105.42, a, null, null)
      .find((s) => s.type === 'DC_BREAKOUT_UP')!
    expect(sig.price).toBe(105.42)
  })
})

// ─── DONCHIAN MIDLINE CROSS SIGNALS ─────────────────────────

describe('Donchian midline cross signals', () => {
  it('detects DC_MID_CROSS_UP when price crosses above the midline', () => {
    // Prev: ema20=95 sat below the prior mid=100 (so wasAbove=false).
    // Now:  price=101 sits above curr.mid=100 (so nowAbove=true).
    const prev = mkAnalytics({
      ema20: 95,
      donchian: { upper: 110, middle: 100, lower: 90 },
    })
    const curr = mkAnalytics({
      donchian: { upper: 110, middle: 100, lower: 90 },
    })
    const signals = detectSignals('BTC-USD-SPOT', 101, curr, null, prev)
    expect(signals.some((s) => s.type === 'DC_MID_CROSS_UP')).toBe(true)
    expect(signals.some((s) => s.type === 'DC_MID_CROSS_DOWN')).toBe(false)
  })

  it('detects DC_MID_CROSS_DOWN when price crosses below the midline', () => {
    const prev = mkAnalytics({
      ema20: 105, // was above prior mid=100
      donchian: { upper: 110, middle: 100, lower: 90 },
    })
    const curr = mkAnalytics({
      donchian: { upper: 110, middle: 100, lower: 90 },
    })
    const signals = detectSignals('BTC-USD-SPOT', 99, curr, null, prev)
    expect(signals.some((s) => s.type === 'DC_MID_CROSS_DOWN')).toBe(true)
    expect(signals.some((s) => s.type === 'DC_MID_CROSS_UP')).toBe(false)
  })

  it('no cross signal when price stays on the same side of the midline', () => {
    const prev = mkAnalytics({
      ema20: 105, // was above
      donchian: { upper: 110, middle: 100, lower: 90 },
    })
    const curr = mkAnalytics({
      donchian: { upper: 110, middle: 100, lower: 90 },
    })
    const signals = detectSignals('BTC-USD-SPOT', 103, curr, null, prev) // still above
    expect(signals.some((s) => s.type === 'DC_MID_CROSS_UP')).toBe(false)
    expect(signals.some((s) => s.type === 'DC_MID_CROSS_DOWN')).toBe(false)
  })

  it('no signal when prevAnalytics is null (cold start)', () => {
    const curr = mkAnalytics({
      donchian: { upper: 110, middle: 100, lower: 90 },
    })
    const signals = detectSignals('BTC-USD-SPOT', 101, curr, null, null)
    expect(signals.some((s) => s.type === 'DC_MID_CROSS_UP')).toBe(false)
  })

  it('no signal when current donchian is null', () => {
    const prev = mkAnalytics({
      ema20: 95,
      donchian: { upper: 110, middle: 100, lower: 90 },
    })
    const curr = mkAnalytics({ donchian: null })
    const signals = detectSignals('BTC-USD-SPOT', 101, curr, null, prev)
    expect(signals.some((s) => s.type === 'DC_MID_CROSS_UP')).toBe(false)
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
