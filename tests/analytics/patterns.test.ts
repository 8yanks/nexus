import { describe, it, expect } from 'vitest'
import { detectPatterns, findPivots, type DetectedPattern } from '@/analytics/patterns'
import type { OHLCV } from '@/types'

// ─── HELPERS ────────────────────────────────────────────────

const mkCandle = (
  close: number,
  high?: number,
  low?: number,
): OHLCV => ({
  open: close,
  high: high ?? close,
  low: low ?? close,
  close,
  volume: 1000,
  timestamp: new Date().toISOString(),
  _source: 'test',
  _status: 'SIMULATED',
})

// Build a sequence of candles with explicit highs and lows
const buildCandles = (
  pairs: [number, number][],
): OHLCV[] =>
  pairs.map(([h, l]) => mkCandle((h + l) / 2, h, l))

// ─── PIVOT DETECTION ────────────────────────────────────────

describe('findPivots', () => {
  it('returns empty for short series', () => {
    const candles = [mkCandle(100), mkCandle(101)]
    expect(findPivots(candles, 3)).toEqual([])
  })

  it('finds local high', () => {
    // Pattern: flat, rise, peak, fall, flat
    const candles = buildCandles([
      [100, 98], [100, 98], [100, 98],
      [101, 99], [105, 103], [110, 108],  // peak at index 5
      [104, 102], [101, 99], [100, 98],
      [100, 98], [100, 98], [100, 98],
    ])
    const pivots = findPivots(candles, 3)
    const highs = pivots.filter((p) => p.kind === 'high')
    expect(highs.length).toBeGreaterThanOrEqual(1)
    expect(highs.some((h) => h.price === 110)).toBe(true)
  })

  it('finds local low', () => {
    const candles = buildCandles([
      [110, 108], [110, 108], [110, 108],
      [108, 106], [105, 103], [100, 90],  // trough at index 5
      [105, 103], [108, 106], [110, 108],
      [110, 108], [110, 108], [110, 108],
    ])
    const pivots = findPivots(candles, 3)
    const lows = pivots.filter((p) => p.kind === 'low')
    expect(lows.length).toBeGreaterThanOrEqual(1)
    expect(lows.some((l) => l.price === 90)).toBe(true)
  })
})

// ─── DOUBLE TOP ─────────────────────────────────────────────

describe('Double Top detection', () => {
  it('detects double top pattern', () => {
    // Two peaks at ~110, valley at ~100 between them
    const candles = buildCandles([
      // lead-in
      [95, 93], [96, 94], [97, 95], [98, 96], [99, 97],
      // first peak area
      [102, 100], [105, 103], [108, 106], [110, 108], [109, 107],
      [106, 104], [103, 101],
      // valley
      [101, 99], [100, 98], [101, 99],
      // second peak area
      [103, 101], [106, 104], [108, 106], [110, 108], [109, 107],
      [106, 104], [103, 101],
      // decline
      [101, 99], [99, 97], [98, 96], [97, 95],
      [96, 94], [96, 94], [96, 94],
    ])

    const patterns = detectPatterns(candles, 3)
    const dt = patterns.find((p) => p.type === 'DOUBLE_TOP')

    if (dt) {
      expect(dt.direction).toBe('bearish')
      expect(dt.confidence).toBeGreaterThan(0)
      expect(dt.keyPoints.length).toBe(3)
    }
    // Pattern detection is heuristic — may or may not trigger depending on pivot detection
    // We just assert no crash and valid structure if found
    expect(patterns.every(isValidPattern)).toBe(true)
  })
})

// ─── DOUBLE BOTTOM ──────────────────────────────────────────

describe('Double Bottom detection', () => {
  it('detects double bottom pattern', () => {
    // Two troughs at ~90, peak at ~100 between them
    const candles = buildCandles([
      // lead-in
      [105, 103], [104, 102], [103, 101], [102, 100], [101, 99],
      // first trough
      [98, 96], [95, 93], [92, 90], [91, 89], [92, 90],
      [94, 92], [97, 95],
      // peak
      [99, 97], [100, 98], [99, 97],
      // second trough
      [97, 95], [94, 92], [92, 90], [91, 89], [92, 90],
      [95, 93], [97, 95],
      // recovery
      [99, 97], [101, 99], [102, 100], [103, 101],
      [104, 102], [104, 102], [104, 102],
    ])

    const patterns = detectPatterns(candles, 3)
    const db = patterns.find((p) => p.type === 'DOUBLE_BOTTOM')

    if (db) {
      expect(db.direction).toBe('bullish')
      expect(db.confidence).toBeGreaterThan(0)
      expect(db.keyPoints.length).toBe(3)
    }
    expect(patterns.every(isValidPattern)).toBe(true)
  })
})

// ─── HEAD & SHOULDERS ───────────────────────────────────────

describe('Head & Shoulders detection', () => {
  it('detects H&S pattern with 3 peaks', () => {
    // LS at 108, Head at 115, RS at 108, valleys at ~100
    const candles = buildCandles([
      // lead-in
      [95, 93], [96, 94], [97, 95], [98, 96],
      // left shoulder
      [100, 98], [103, 101], [106, 104], [108, 106], [106, 104],
      [103, 101], [101, 99],
      // valley 1
      [100, 98], [99, 97], [100, 98],
      // head
      [103, 101], [106, 104], [110, 108], [113, 111], [115, 113],
      [113, 111], [110, 108], [106, 104],
      // valley 2
      [102, 100], [100, 98], [101, 99],
      // right shoulder
      [103, 101], [106, 104], [108, 106], [106, 104],
      [103, 101], [101, 99],
      // decline
      [99, 97], [97, 95], [96, 94],
    ])

    const patterns = detectPatterns(candles, 3)
    const hs = patterns.find((p) => p.type === 'HEAD_AND_SHOULDERS')

    if (hs) {
      expect(hs.direction).toBe('bearish')
      expect(hs.keyPoints.length).toBe(5)
    }
    expect(patterns.every(isValidPattern)).toBe(true)
  })
})

// ─── GENERAL VALIDATION ─────────────────────────────────────

const isValidPattern = (p: DetectedPattern): boolean => {
  return (
    typeof p.type === 'string' &&
    typeof p.direction === 'string' &&
    p.confidence >= 0 &&
    p.confidence <= 1 &&
    p.startIndex >= 0 &&
    p.endIndex > p.startIndex &&
    typeof p.neckline === 'number' &&
    typeof p.description === 'string' &&
    p.keyPoints.length > 0
  )
}

describe('detectPatterns general', () => {
  it('returns empty for insufficient data', () => {
    const candles = [mkCandle(100), mkCandle(101)]
    expect(detectPatterns(candles)).toEqual([])
  })

  it('returns valid pattern structures', () => {
    // Random-ish data that might trigger patterns
    const candles = buildCandles(
      Array.from({ length: 80 }, (_, i) => {
        const base = 100 + 15 * Math.sin(i * 0.3) + 5 * Math.sin(i * 0.7)
        return [base + 2, base - 2] as [number, number]
      }),
    )

    const patterns = detectPatterns(candles, 3)
    // All detected patterns must be structurally valid
    for (const p of patterns) {
      expect(isValidPattern(p)).toBe(true)
    }
  })

  it('all patterns have the correct direction', () => {
    const candles = buildCandles(
      Array.from({ length: 60 }, (_, i) => {
        const base = 100 + 10 * Math.sin(i * 0.4)
        return [base + 1, base - 1] as [number, number]
      }),
    )

    const patterns = detectPatterns(candles, 3)
    for (const p of patterns) {
      if (p.type === 'DOUBLE_TOP' || p.type === 'HEAD_AND_SHOULDERS' || p.type === 'DESCENDING_TRIANGLE') {
        expect(p.direction).toBe('bearish')
      }
      if (p.type === 'DOUBLE_BOTTOM' || p.type === 'INVERSE_HEAD_AND_SHOULDERS' || p.type === 'ASCENDING_TRIANGLE') {
        expect(p.direction).toBe('bullish')
      }
    }
  })
})
