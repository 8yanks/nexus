import type { CandleSeries } from '@/types'

// ─── RETURN TYPES ────────────────────────────────────────────

export interface CorrelationPair {
  instrumentA: string
  instrumentB: string
  correlation: number       // -1 to +1
  sampleSize: number        // number of overlapping candles used
}

export interface CorrelationMatrix {
  instrumentIds: string[]
  matrix: number[][]         // matrix[i][j] = correlation(i, j)
  pairs: CorrelationPair[]   // flat list of all unique pairs
  computedAt: string
}

// ─── CORE: PEARSON CORRELATION ──────────────────────────────
// Pure function — no side effects.
// Returns null if fewer than 2 overlapping data points.

export const pearsonCorrelation = (
  xs: number[],
  ys: number[],
): number | null => {
  const n = Math.min(xs.length, ys.length)
  if (n < 2) return null

  const xSlice = xs.slice(-n)
  const ySlice = ys.slice(-n)

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0
  for (let i = 0; i < n; i++) {
    sumX += xSlice[i]
    sumY += ySlice[i]
    sumXY += xSlice[i] * ySlice[i]
    sumX2 += xSlice[i] ** 2
    sumY2 += ySlice[i] ** 2
  }

  const denominator = Math.sqrt(
    (n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2),
  )

  if (denominator === 0) return 0
  return (n * sumXY - sumX * sumY) / denominator
}

// ─── RETURNS CORRELATION (percent changes, not raw prices) ──
// Using log returns avoids scale bias between e.g. BTC ($67k) and SOL ($178)

export const calcLogReturns = (closes: number[]): number[] => {
  const returns: number[] = []
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0 && closes[i] > 0) {
      returns.push(Math.log(closes[i] / closes[i - 1]))
    }
  }
  return returns
}

// ─── ROLLING CORRELATION ────────────────────────────────────
// Computes correlation over a sliding window of `period` returns.
// Returns the most recent correlation value.

export const rollingCorrelation = (
  closesA: number[],
  closesB: number[],
  period = 20,
): number | null => {
  const retA = calcLogReturns(closesA)
  const retB = calcLogReturns(closesB)

  if (retA.length < period || retB.length < period) return null

  const sliceA = retA.slice(-period)
  const sliceB = retB.slice(-period)

  return pearsonCorrelation(sliceA, sliceB)
}

// ─── FULL CORRELATION MATRIX ────────────────────────────────
// Builds an N×N matrix from a map of candle series.
// Uses log returns over the given window period.

export const computeCorrelationMatrix = (
  candlesMap: Record<string, CandleSeries>,
  instrumentIds: string[],
  period = 50,
): CorrelationMatrix => {
  const n = instrumentIds.length
  const matrix: number[][] = Array.from({ length: n }, () =>
    Array(n).fill(0),
  )
  const pairs: CorrelationPair[] = []

  // Extract log returns for each instrument
  const returnsMap: Record<string, number[]> = {}
  for (const id of instrumentIds) {
    const series = candlesMap[id]
    if (series && series.candles.length > 1) {
      returnsMap[id] = calcLogReturns(series.candles.map((c) => c.close))
    } else {
      returnsMap[id] = []
    }
  }

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1 // self-correlation

    for (let j = i + 1; j < n; j++) {
      const retA = returnsMap[instrumentIds[i]]
      const retB = returnsMap[instrumentIds[j]]

      const minLen = Math.min(retA.length, retB.length)
      const usable = Math.min(minLen, period)

      let corr: number | null = null
      if (usable >= 5) {
        corr = pearsonCorrelation(
          retA.slice(-usable),
          retB.slice(-usable),
        )
      }

      const value = corr ?? 0
      matrix[i][j] = value
      matrix[j][i] = value

      pairs.push({
        instrumentA: instrumentIds[i],
        instrumentB: instrumentIds[j],
        correlation: value,
        sampleSize: usable,
      })
    }
  }

  return {
    instrumentIds,
    matrix,
    pairs,
    computedAt: new Date().toISOString(),
  }
}

// ─── HELPERS ────────────────────────────────────────────────

export const getStrongestCorrelations = (
  pairs: CorrelationPair[],
  topN = 5,
): CorrelationPair[] =>
  [...pairs]
    .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
    .slice(0, topN)

export const getMostDecorrelated = (
  pairs: CorrelationPair[],
  topN = 5,
): CorrelationPair[] =>
  [...pairs]
    .sort((a, b) => Math.abs(a.correlation) - Math.abs(b.correlation))
    .slice(0, topN)
