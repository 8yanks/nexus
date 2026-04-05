import { describe, it, expect } from 'vitest'
import {
  calcEMA,
  calcRSI,
  calcATR,
  calcVWAP,
  calcBollinger,
  calcDonchian,
  calcZScore,
  calcRelativeVolume,
} from '@/analytics/indicators'
import type { OHLCV } from '@/types'

// ─── HELPERS ────────────────────────────────────────────────

const mkCandle = (close: number, high?: number, low?: number, volume = 1000): OHLCV => ({
  open: close,
  high: high ?? close * 1.01,
  low: low ?? close * 0.99,
  close,
  volume,
  timestamp: new Date().toISOString(),
  _source: 'test',
  _status: 'SIMULATED',
})

const range = (n: number, fn: (i: number) => number): number[] =>
  Array.from({ length: n }, (_, i) => fn(i))

// ─── EMA ────────────────────────────────────────────────────

describe('calcEMA', () => {
  it('returns null when data is shorter than period', () => {
    expect(calcEMA([1, 2, 3], 10)).toBeNull()
  })

  it('returns a number for valid data', () => {
    const data = range(30, (i) => 100 + i)
    const ema = calcEMA(data, 20)
    expect(ema).not.toBeNull()
    expect(typeof ema).toBe('number')
  })

  it('EMA with period=1 tracks the last value closely', () => {
    const data = [10, 20, 30, 40, 50]
    const ema = calcEMA(data, 1)
    // With k = 2/(1+1) = 1, EMA should equal last value
    expect(ema).toBeCloseTo(50, 5)
  })

  it('weights recent values more heavily', () => {
    const flat = range(30, () => 100)
    const rising = [...range(20, () => 100), ...range(10, (i) => 100 + i * 2)]
    const emaFlat = calcEMA(flat, 20)!
    const emaRising = calcEMA(rising, 20)!
    expect(emaRising).toBeGreaterThan(emaFlat)
  })
})

// ─── RSI ────────────────────────────────────────────────────

describe('calcRSI', () => {
  it('returns null when data is insufficient', () => {
    expect(calcRSI([1, 2, 3], 14)).toBeNull()
  })

  it('returns 100 for only-upward moves', () => {
    const data = range(20, (i) => 100 + i)
    const rsi = calcRSI(data)
    expect(rsi).toBeCloseTo(100, 0)
  })

  it('returns 0 for only-downward moves', () => {
    const data = range(20, (i) => 200 - i)
    const rsi = calcRSI(data)
    expect(rsi).toBeCloseTo(0, 0)
  })

  it('returns value between 0 and 100', () => {
    const data = range(30, (i) => 100 + Math.sin(i) * 10)
    const rsi = calcRSI(data)!
    expect(rsi).toBeGreaterThanOrEqual(0)
    expect(rsi).toBeLessThanOrEqual(100)
  })
})

// ─── ATR ────────────────────────────────────────────────────

describe('calcATR', () => {
  it('returns null when candles are insufficient', () => {
    const candles = range(5, (i) => mkCandle(100 + i))
    expect(calcATR(candles)).toBeNull()
  })

  it('returns positive value for valid data', () => {
    const candles = range(20, (i) => mkCandle(100 + Math.sin(i) * 5, 106, 94))
    const atr = calcATR(candles)!
    expect(atr).toBeGreaterThan(0)
  })
})

// ─── VWAP ───────────────────────────────────────────────────

describe('calcVWAP', () => {
  it('returns null for empty candles', () => {
    expect(calcVWAP([])).toBeNull()
  })

  it('returns typical price for single candle', () => {
    const c = mkCandle(100, 105, 95, 1000)
    const expected = (105 + 95 + 100) / 3
    expect(calcVWAP([c])).toBeCloseTo(expected, 5)
  })
})

// ─── BOLLINGER ──────────────────────────────────────────────

describe('calcBollinger', () => {
  it('returns null when data is insufficient', () => {
    expect(calcBollinger([1, 2, 3])).toBeNull()
  })

  it('upper > middle > lower', () => {
    const data = range(30, (i) => 100 + Math.sin(i) * 5)
    const bb = calcBollinger(data)!
    expect(bb.upper).toBeGreaterThan(bb.middle)
    expect(bb.middle).toBeGreaterThan(bb.lower)
  })

  it('bandwidth is 0 for constant values', () => {
    const data = range(30, () => 100)
    const bb = calcBollinger(data)!
    expect(bb.bandwidth).toBe(0)
    expect(bb.upper).toBe(bb.middle)
    expect(bb.lower).toBe(bb.middle)
  })
})

// ─── DONCHIAN ───────────────────────────────────────────────

describe('calcDonchian', () => {
  it('returns null when candles are insufficient', () => {
    expect(calcDonchian([mkCandle(100)])).toBeNull()
  })

  it('upper is max high, lower is min low', () => {
    const candles = range(25, (i) => mkCandle(100, 100 + i, 90 + i))
    const dc = calcDonchian(candles)!
    expect(dc.upper).toBe(Math.max(...candles.slice(-20).map((c) => c.high)))
    expect(dc.lower).toBe(Math.min(...candles.slice(-20).map((c) => c.low)))
    expect(dc.middle).toBeCloseTo((dc.upper + dc.lower) / 2)
  })
})

// ─── Z-SCORE ────────────────────────────────────────────────

describe('calcZScore', () => {
  it('returns null when data is insufficient', () => {
    expect(calcZScore([1, 2])).toBeNull()
  })

  it('returns 0 for constant values', () => {
    expect(calcZScore(range(25, () => 50))).toBe(0)
  })

  it('is positive when last value is above mean', () => {
    const data = [...range(19, () => 100), 120]
    expect(calcZScore(data)!).toBeGreaterThan(0)
  })
})

// ─── RELATIVE VOLUME ────────────────────────────────────────

describe('calcRelativeVolume', () => {
  it('returns null when data is insufficient', () => {
    expect(calcRelativeVolume([100, 200])).toBeNull()
  })

  it('returns 1 when current equals average', () => {
    const volumes = range(22, () => 1000)
    expect(calcRelativeVolume(volumes)).toBeCloseTo(1)
  })

  it('returns 2 when current is double the average', () => {
    const volumes = [...range(20, () => 1000), 2000]
    expect(calcRelativeVolume(volumes)).toBeCloseTo(2)
  })
})
