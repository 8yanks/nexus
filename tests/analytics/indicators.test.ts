import { describe, it, expect } from 'vitest'
import {
  calcEMA,
  calcEMASeries,
  calcRSI,
  calcATR,
  calcVWAP,
  calcBollinger,
  calcBollingerSeries,
  calcDonchian,
  calcDonchianBreakout,
  calcDonchianSeries,
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

// ─── EMA SERIES (for chart overlays) ────────────────────────

describe('calcEMASeries', () => {
  it('returns an array of the same length as the input', () => {
    const data = range(50, (i) => 100 + i)
    expect(calcEMASeries(data, 20)).toHaveLength(50)
  })

  it('returns nulls for every position when data is shorter than period', () => {
    const out = calcEMASeries([1, 2, 3], 10)
    expect(out).toEqual([null, null, null])
  })

  it('has nulls for positions before the seed window', () => {
    const data = range(30, (i) => 100 + i)
    const out = calcEMASeries(data, 20)
    // Positions 0..18 have no seed yet.
    for (let i = 0; i < 19; i++) expect(out[i]).toBeNull()
    // Position 19 (period-1) holds the SMA seed.
    expect(out[19]).not.toBeNull()
  })

  it('seed at index period-1 equals the SMA of the first `period` values', () => {
    const data = range(25, (i) => i) // 0..24
    const out = calcEMASeries(data, 20)
    const sma = (0 + 19) / 2 // 0..19 avg
    expect(out[19]).toBeCloseTo(sma, 10)
  })

  it('final value matches calcEMA on the same window', () => {
    const data = range(60, (i) => 100 + Math.sin(i / 4) * 5)
    const ema = calcEMA(data, 20)!
    const series = calcEMASeries(data, 20)
    expect(series[series.length - 1]).toBeCloseTo(ema, 10)
  })

  it('flat input converges to the constant value', () => {
    const data = range(40, () => 100)
    const out = calcEMASeries(data, 10)
    // Every non-null entry should be exactly 100 (no drift).
    for (let i = 9; i < 40; i++) expect(out[i]).toBeCloseTo(100, 10)
  })

  it('handles period === data length: only the last slot is filled', () => {
    const data = range(10, (i) => i + 1) // 1..10
    const out = calcEMASeries(data, 10)
    expect(out.slice(0, 9).every((v) => v === null)).toBe(true)
    // SMA of 1..10 = 5.5
    expect(out[9]).toBeCloseTo(5.5, 10)
  })

  it('rejects non-positive periods', () => {
    const data = range(10, (i) => i)
    expect(calcEMASeries(data, 0)).toEqual(new Array(10).fill(null))
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

// ─── BOLLINGER SERIES (for chart overlays) ──────────────────

describe('calcBollingerSeries', () => {
  it('returns an array of the same length as the input', () => {
    const data = range(40, (i) => 100 + i)
    expect(calcBollingerSeries(data, 20)).toHaveLength(40)
  })

  it('returns all nulls when data is shorter than period', () => {
    const out = calcBollingerSeries([1, 2, 3], 20)
    expect(out.length).toBe(3)
    expect(out.every((v) => v === null)).toBe(true)
  })

  it('fills null before the seed window and a bands object after', () => {
    const data = range(25, (i) => 100 + i)
    const out = calcBollingerSeries(data, 20)
    for (let i = 0; i < 19; i++) expect(out[i]).toBeNull()
    expect(out[19]).not.toBeNull()
    expect(out[24]).not.toBeNull()
  })

  it('final value matches calcBollinger on the same window', () => {
    const data = range(50, (i) => 100 + Math.sin(i / 3) * 5)
    const snap = calcBollinger(data, 20, 2)!
    const series = calcBollingerSeries(data, 20, 2)
    const last = series[series.length - 1]!
    expect(last.middle).toBeCloseTo(snap.middle, 8)
    expect(last.upper).toBeCloseTo(snap.upper, 8)
    expect(last.lower).toBeCloseTo(snap.lower, 8)
    expect(last.bandwidth).toBeCloseTo(snap.bandwidth, 8)
  })

  it('collapses all three bands onto the mean for flat input', () => {
    const data = range(40, () => 100)
    const out = calcBollingerSeries(data, 20)
    for (let i = 19; i < 40; i++) {
      const bb = out[i]!
      expect(bb.middle).toBeCloseTo(100, 10)
      expect(bb.upper).toBeCloseTo(100, 10)
      expect(bb.lower).toBeCloseTo(100, 10)
      expect(bb.bandwidth).toBe(0)
    }
  })

  it('upper > middle > lower at every filled position for noisy input', () => {
    const data = range(60, (i) => 100 + Math.sin(i / 2) * 4)
    const out = calcBollingerSeries(data, 20)
    for (let i = 19; i < 60; i++) {
      const bb = out[i]!
      expect(bb.upper).toBeGreaterThan(bb.middle)
      expect(bb.middle).toBeGreaterThan(bb.lower)
    }
  })

  it('rejects non-positive period or multiplier', () => {
    const data = range(25, (i) => i)
    expect(calcBollingerSeries(data, 0)).toEqual(new Array(25).fill(null))
    expect(calcBollingerSeries(data, 20, 0)).toEqual(new Array(25).fill(null))
    expect(calcBollingerSeries(data, 20, -1)).toEqual(new Array(25).fill(null))
  })

  it('respects the multiplier: wider mult → wider bands', () => {
    const data = range(40, (i) => 100 + Math.sin(i / 2) * 4)
    const tight = calcBollingerSeries(data, 20, 1)
    const wide = calcBollingerSeries(data, 20, 3)
    const lastTight = tight[tight.length - 1]!
    const lastWide = wide[wide.length - 1]!
    expect(lastWide.upper - lastWide.lower).toBeGreaterThan(
      lastTight.upper - lastTight.lower,
    )
    // Middle (SMA) is independent of mult.
    expect(lastTight.middle).toBeCloseTo(lastWide.middle, 10)
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

describe('calcDonchianBreakout', () => {
  it('returns null when there are not enough bars (period + 1 minimum)', () => {
    // Need 21 candles for the default period=20 (20 prior + 1 current).
    expect(calcDonchianBreakout(range(20, () => mkCandle(100)))).toBeNull()
    expect(calcDonchianBreakout(range(21, () => mkCandle(100)))).not.toBeNull()
  })

  it('excludes the current candle from the window', () => {
    // 20 flat bars at 100, then a fresh new high at 200. The breakout
    // channel must reflect the OLD range (100), NOT include the new
    // bar — otherwise `price > upper` could never fire.
    const candles = [
      ...range(20, () => mkCandle(100, 100, 100)),
      mkCandle(200, 200, 200),
    ]
    const dc = calcDonchianBreakout(candles)!
    expect(dc.upper).toBe(100)
    expect(dc.lower).toBe(100)
  })

  it('matches calcDonchian on candles.slice(0, -1)', () => {
    const candles = range(30, (i) => mkCandle(100, 100 + i, 90 + i))
    const breakout = calcDonchianBreakout(candles, 20)!
    const prior = calcDonchian(candles.slice(0, -1), 20)!
    expect(breakout.upper).toBe(prior.upper)
    expect(breakout.lower).toBe(prior.lower)
    expect(breakout.middle).toBe(prior.middle)
  })

  it('respects a custom period', () => {
    const candles = range(50, (i) => mkCandle(100, 100 + i, 90 + i))
    const dc = calcDonchianBreakout(candles, 10)!
    // Window is bars 39..48 (last 10 before the current at 49).
    const expectedUpper = Math.max(...candles.slice(39, 49).map((c) => c.high))
    expect(dc.upper).toBe(expectedUpper)
  })
})

describe('calcDonchianSeries', () => {
  it('returns an array of the same length as the input', () => {
    const candles = range(40, (i) => mkCandle(100 + i, 110 + i, 90 + i))
    expect(calcDonchianSeries(candles, 20)).toHaveLength(40)
  })

  it('returns all nulls when data is shorter than period', () => {
    const candles = range(5, (i) => mkCandle(100 + i))
    const out = calcDonchianSeries(candles, 20)
    expect(out.length).toBe(5)
    expect(out.every((v) => v === null)).toBe(true)
  })

  it('fills null before the seed window and a channel object after', () => {
    const candles = range(25, (i) => mkCandle(100 + i, 110 + i, 90 + i))
    const out = calcDonchianSeries(candles, 20)
    for (let i = 0; i < 19; i++) expect(out[i]).toBeNull()
    expect(out[19]).not.toBeNull()
    expect(out[24]).not.toBeNull()
  })

  it('final value matches calcDonchian on the same window', () => {
    const candles = range(50, (i) => mkCandle(100, 100 + Math.sin(i / 3) * 5, 100 - Math.sin(i / 3) * 5))
    const snap = calcDonchian(candles, 20)!
    const series = calcDonchianSeries(candles, 20)
    const last = series[series.length - 1]!
    expect(last.upper).toBeCloseTo(snap.upper, 8)
    expect(last.lower).toBeCloseTo(snap.lower, 8)
    expect(last.middle).toBeCloseTo(snap.middle, 8)
  })

  it('collapses upper/middle/lower onto a single line when high == low across the window', () => {
    const candles = range(40, () => mkCandle(100, 100, 100))
    const out = calcDonchianSeries(candles, 20)
    for (let i = 19; i < 40; i++) {
      const dc = out[i]!
      expect(dc.upper).toBe(100)
      expect(dc.lower).toBe(100)
      expect(dc.middle).toBe(100)
    }
  })

  it('upper >= middle >= lower at every filled position', () => {
    const candles = range(40, (i) => mkCandle(100, 100 + Math.sin(i / 2) * 5, 100 - Math.sin(i / 2) * 5))
    const out = calcDonchianSeries(candles, 20)
    for (let i = 19; i < 40; i++) {
      const dc = out[i]!
      expect(dc.upper).toBeGreaterThanOrEqual(dc.middle)
      expect(dc.middle).toBeGreaterThanOrEqual(dc.lower)
    }
  })

  it('rejects non-positive period', () => {
    const candles = range(25, (i) => mkCandle(100 + i))
    expect(calcDonchianSeries(candles, 0)).toEqual(new Array(25).fill(null))
    expect(calcDonchianSeries(candles, -1)).toEqual(new Array(25).fill(null))
  })

  it('window slides correctly: a recent spike raises only positions that include it', () => {
    // Flat 100 highs / 90 lows for 30 bars, then a spike at index 30 with high=200.
    const candles = range(40, (i) => i === 30 ? mkCandle(100, 200, 90) : mkCandle(100, 100, 90))
    const out = calcDonchianSeries(candles, 20)
    // Position 29 — window is bars 10..29, spike NOT included → upper still 100.
    expect(out[29]!.upper).toBe(100)
    // Position 30 — window is bars 11..30, spike included → upper = 200.
    expect(out[30]!.upper).toBe(200)
    // Position 49 (last) — n/a here; data is 40 bars. Position 39 is the last
    // filled. Window 20..39 still includes the spike at 30 → upper = 200.
    expect(out[39]!.upper).toBe(200)
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
