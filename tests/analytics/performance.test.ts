import { describe, it, expect } from 'vitest'
import type { OHLCV } from '@/types'
import {
  computePerformance,
  computeKeyStats,
  DEFAULT_WINDOWS,
} from '@/analytics/performance'

// Build an ascending synthetic candle series. Close walks linearly
// so the percent-change math is trivial to check by hand.
const mkCandles = (closes: number[]): OHLCV[] =>
  closes.map((c, i) => ({
    open: c,
    high: c + 1,
    low:  c - 1,
    close: c,
    volume: 100 + i,
    timestamp: new Date(2026, 0, 1, i).toISOString(),
    _source: 'mock',
    _status: 'SIMULATED',
  }))

describe('computePerformance', () => {
  it('returns the configured label + barsBack for every window', () => {
    const result = computePerformance([])
    expect(result.map((p) => p.label)).toEqual(['1H', '6H', '1D', '3D', '7D'])
    expect(result.map((p) => p.barsBack)).toEqual([1, 6, 24, 72, 168])
    // Empty input → every window is null
    expect(result.every((p) => p.changePct === null)).toBe(true)
  })

  it('returns null for windows that exceed available history', () => {
    // 10 bars — only 1H and 6H are reachable, 1D/3D/7D exceed it.
    const candles = mkCandles([100, 101, 102, 103, 104, 105, 106, 107, 108, 110])
    const result = computePerformance(candles)
    const byLabel = Object.fromEntries(result.map((p) => [p.label, p.changePct]))
    expect(byLabel['1H']).not.toBeNull()
    expect(byLabel['6H']).not.toBeNull()
    expect(byLabel['1D']).toBeNull()
    expect(byLabel['3D']).toBeNull()
    expect(byLabel['7D']).toBeNull()
  })

  it('computes (last - ref) / ref for reachable windows', () => {
    // 2 bars: last 110, prev 100 → +10% over 1H.
    const candles = mkCandles([100, 110])
    const [oneH] = computePerformance(candles, [{ label: '1H', barsBack: 1 }])
    expect(oneH.changePct).toBeCloseTo(0.1, 6)
  })

  it('negative change renders as a negative fraction', () => {
    const candles = mkCandles([100, 90])
    const [oneH] = computePerformance(candles, [{ label: '1H', barsBack: 1 }])
    expect(oneH.changePct).toBeCloseTo(-0.1, 6)
  })

  it('ignores non-finite reference closes and returns null', () => {
    const candles: OHLCV[] = [
      { open: 0, high: 0, low: 0, close: Number.NaN, volume: 1, timestamp: 't0', _source: 'mock', _status: 'SIMULATED' },
      { open: 1, high: 1, low: 1, close: 100, volume: 1, timestamp: 't1', _source: 'mock', _status: 'SIMULATED' },
    ]
    const [oneH] = computePerformance(candles, [{ label: '1H', barsBack: 1 }])
    expect(oneH.changePct).toBeNull()
  })

  it('defaults windows match the documented DEFAULT_WINDOWS constant', () => {
    const result = computePerformance(mkCandles([100]))
    expect(result.length).toBe(DEFAULT_WINDOWS.length)
  })
})

describe('computeKeyStats', () => {
  it('rangePosition24h is 0 at the low, 1 at the high, 0.5 in the middle', () => {
    const candles = mkCandles([100])
    expect(computeKeyStats(candles, 100, 100, 200).rangePosition24h).toBe(0)
    expect(computeKeyStats(candles, 200, 100, 200).rangePosition24h).toBe(1)
    expect(computeKeyStats(candles, 150, 100, 200).rangePosition24h).toBe(0.5)
  })

  it('rangePosition24h is clamped to [0, 1]', () => {
    const candles = mkCandles([100])
    expect(computeKeyStats(candles, 300, 100, 200).rangePosition24h).toBe(1)
    expect(computeKeyStats(candles, 50, 100, 200).rangePosition24h).toBe(0)
  })

  it('rangePosition24h is null for a flat or malformed range', () => {
    const candles = mkCandles([100])
    expect(computeKeyStats(candles, 100, 100, 100).rangePosition24h).toBeNull()
    expect(computeKeyStats(candles, 100, Number.NaN, 200).rangePosition24h).toBeNull()
  })

  it('athWindow / atlWindow reflect highest high + lowest low in the window', () => {
    // high = close+1 per mkCandles, low = close-1
    const candles = mkCandles([100, 110, 95, 120, 90])
    const stats = computeKeyStats(candles, 100, 90, 120)
    expect(stats.athWindow).toBe(121)  // 120 + 1
    expect(stats.atlWindow).toBe(89)   // 90 - 1
  })

  it('relativeVolume compares last bar to previous-N mean', () => {
    // 5 bars, baseline caps at length-1 = 4. Baseline vols: 100..103 (avg 101.5).
    // Last vol is 104, so rel = 104 / 101.5 ≈ 1.0246.
    const candles = mkCandles([100, 101, 102, 103, 104])
    const stats = computeKeyStats(candles, 104, 100, 104)
    expect(stats.relativeVolume).toBeCloseTo(104 / 101.5, 4)
    expect(stats.relativeVolumeBase).toBe(4)
  })

  it('relativeVolume is null for single-bar windows', () => {
    const candles = mkCandles([100])
    const stats = computeKeyStats(candles, 100, 99, 101)
    expect(stats.relativeVolume).toBeNull()
    expect(stats.relativeVolumeBase).toBe(0)
  })

  it('empty candle array yields null ATH/ATL and null relativeVolume', () => {
    const stats = computeKeyStats([], 100, 99, 101)
    expect(stats.athWindow).toBeNull()
    expect(stats.atlWindow).toBeNull()
    expect(stats.relativeVolume).toBeNull()
  })
})
