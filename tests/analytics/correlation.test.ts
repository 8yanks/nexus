import { describe, it, expect } from 'vitest'
import {
  pearsonCorrelation,
  calcLogReturns,
  rollingCorrelation,
  computeCorrelationMatrix,
  getStrongestCorrelations,
  getMostDecorrelated,
} from '@/analytics/correlation'
import type { CandleSeries, OHLCV } from '@/types'

// ─── HELPERS ────────────────────────────────────────────────

const mkCandle = (close: number): OHLCV => ({
  open: close,
  high: close * 1.01,
  low: close * 0.99,
  close,
  volume: 1000,
  timestamp: new Date().toISOString(),
  _source: 'test',
  _status: 'SIMULATED',
})

const mkSeries = (id: string, closes: number[]): CandleSeries => ({
  instrumentId: id,
  timeframe: '1h',
  candles: closes.map(mkCandle),
  _source: 'test',
  _status: 'SIMULATED',
  _provenance: {
    source: 'test',
    fetchMethod: 'mock',
    latencyMs: 0,
    timestamp: new Date().toISOString(),
    receivedAt: new Date().toISOString(),
  },
  generatedAt: new Date().toISOString(),
})

// ─── PEARSON CORRELATION ────────────────────────────────────

describe('pearsonCorrelation', () => {
  it('returns null for fewer than 2 data points', () => {
    expect(pearsonCorrelation([1], [2])).toBeNull()
    expect(pearsonCorrelation([], [])).toBeNull()
  })

  it('returns +1 for perfectly correlated series', () => {
    const xs = [1, 2, 3, 4, 5]
    const ys = [10, 20, 30, 40, 50]
    expect(pearsonCorrelation(xs, ys)).toBeCloseTo(1, 5)
  })

  it('returns -1 for perfectly inversely correlated series', () => {
    const xs = [1, 2, 3, 4, 5]
    const ys = [50, 40, 30, 20, 10]
    expect(pearsonCorrelation(xs, ys)).toBeCloseTo(-1, 5)
  })

  it('returns ~0 for uncorrelated series', () => {
    const xs = [1, 2, 3, 4, 5, 6, 7, 8]
    const ys = [2, -1, 3, -2, 1, -3, 2, -1]
    const r = pearsonCorrelation(xs, ys)!
    expect(Math.abs(r)).toBeLessThan(0.5)
  })

  it('returns 0 for constant values', () => {
    const xs = [5, 5, 5, 5, 5]
    const ys = [1, 2, 3, 4, 5]
    expect(pearsonCorrelation(xs, ys)).toBe(0)
  })
})

// ─── LOG RETURNS ────────────────────────────────────────────

describe('calcLogReturns', () => {
  it('returns empty for single value', () => {
    expect(calcLogReturns([100])).toEqual([])
  })

  it('computes correct log returns', () => {
    const closes = [100, 110, 105]
    const returns = calcLogReturns(closes)
    expect(returns).toHaveLength(2)
    expect(returns[0]).toBeCloseTo(Math.log(110 / 100), 5)
    expect(returns[1]).toBeCloseTo(Math.log(105 / 110), 5)
  })

  it('returns zero for flat prices', () => {
    const closes = [100, 100, 100]
    const returns = calcLogReturns(closes)
    expect(returns.every((r) => r === 0)).toBe(true)
  })
})

// ─── ROLLING CORRELATION ────────────────────────────────────

describe('rollingCorrelation', () => {
  it('returns null for insufficient data', () => {
    expect(rollingCorrelation([100, 101], [200, 201], 20)).toBeNull()
  })

  it('returns +1 for identical series', () => {
    const n = 30
    const closes = Array.from({ length: n }, (_, i) => 100 + i)
    const r = rollingCorrelation(closes, closes, 20)
    expect(r).toBeCloseTo(1, 5)
  })
})

// ─── CORRELATION MATRIX ─────────────────────────────────────

describe('computeCorrelationMatrix', () => {
  it('creates NxN matrix with 1s on diagonal', () => {
    const ids = ['A', 'B', 'C']
    const n = 30
    const candlesMap: Record<string, CandleSeries> = {
      A: mkSeries('A', Array.from({ length: n }, (_, i) => 100 + i)),
      B: mkSeries('B', Array.from({ length: n }, (_, i) => 200 + i * 2)),
      C: mkSeries('C', Array.from({ length: n }, (_, i) => 50 - i)),
    }

    const result = computeCorrelationMatrix(candlesMap, ids, 20)

    expect(result.instrumentIds).toEqual(ids)
    expect(result.matrix).toHaveLength(3)
    expect(result.matrix[0][0]).toBe(1)
    expect(result.matrix[1][1]).toBe(1)
    expect(result.matrix[2][2]).toBe(1)
  })

  it('matrix is symmetric', () => {
    const ids = ['A', 'B']
    const n = 30
    const candlesMap: Record<string, CandleSeries> = {
      A: mkSeries('A', Array.from({ length: n }, (_, i) => 100 + Math.sin(i) * 10)),
      B: mkSeries('B', Array.from({ length: n }, (_, i) => 200 + Math.cos(i) * 20)),
    }

    const result = computeCorrelationMatrix(candlesMap, ids, 20)
    expect(result.matrix[0][1]).toBeCloseTo(result.matrix[1][0], 10)
  })

  it('generates correct number of pairs', () => {
    const ids = ['A', 'B', 'C', 'D']
    const n = 30
    const candlesMap: Record<string, CandleSeries> = {}
    for (const id of ids) {
      candlesMap[id] = mkSeries(id, Array.from({ length: n }, (_, i) => 100 + Math.random() * i))
    }

    const result = computeCorrelationMatrix(candlesMap, ids, 20)
    // C(4,2) = 6 unique pairs
    expect(result.pairs).toHaveLength(6)
  })
})

// ─── HELPERS ────────────────────────────────────────────────

describe('getStrongestCorrelations', () => {
  it('returns top N pairs by absolute correlation', () => {
    const pairs = [
      { instrumentA: 'A', instrumentB: 'B', correlation: 0.9, sampleSize: 20 },
      { instrumentA: 'A', instrumentB: 'C', correlation: -0.95, sampleSize: 20 },
      { instrumentA: 'B', instrumentB: 'C', correlation: 0.1, sampleSize: 20 },
    ]
    const top = getStrongestCorrelations(pairs, 2)
    expect(top).toHaveLength(2)
    expect(Math.abs(top[0].correlation)).toBeGreaterThanOrEqual(Math.abs(top[1].correlation))
    expect(top[0].correlation).toBe(-0.95)
  })
})

describe('getMostDecorrelated', () => {
  it('returns pairs closest to 0', () => {
    const pairs = [
      { instrumentA: 'A', instrumentB: 'B', correlation: 0.9, sampleSize: 20 },
      { instrumentA: 'A', instrumentB: 'C', correlation: 0.02, sampleSize: 20 },
      { instrumentA: 'B', instrumentB: 'C', correlation: -0.5, sampleSize: 20 },
    ]
    const dec = getMostDecorrelated(pairs, 1)
    expect(dec).toHaveLength(1)
    expect(dec[0].correlation).toBe(0.02)
  })
})
