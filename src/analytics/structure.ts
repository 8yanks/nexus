import type { OHLCV } from '@/types'

// ─── RETURN TYPES ────────────────────────────────────────────

export type PivotType = 'HH' | 'HL' | 'LH' | 'LL'
export type StructureTrend = 'bullish' | 'bearish' | 'neutral'

export interface Pivot {
  type: PivotType
  price: number
  timestamp: string
  index: number
}

export interface StructureResult {
  pivots: Pivot[]
  trend: StructureTrend
  lastHigh: number | null
  lastLow: number | null
}

// ─── HELPERS ─────────────────────────────────────────────────

const isLocalHigh = (candles: OHLCV[], i: number, lookback: number): boolean => {
  if (i < lookback || i >= candles.length - lookback) return false
  const h = candles[i].high
  for (let j = i - lookback; j <= i + lookback; j++) {
    if (j !== i && candles[j].high >= h) return false
  }
  return true
}

const isLocalLow = (candles: OHLCV[], i: number, lookback: number): boolean => {
  if (i < lookback || i >= candles.length - lookback) return false
  const l = candles[i].low
  for (let j = i - lookback; j <= i + lookback; j++) {
    if (j !== i && candles[j].low <= l) return false
  }
  return true
}

// ─── DETECT STRUCTURE ────────────────────────────────────────

export const detectStructure = (
  candles: OHLCV[],
  lookback = 3,
): StructureResult | null => {
  if (candles.length < lookback * 2 + 2) return null

  const highs: { price: number; timestamp: string; index: number }[] = []
  const lows: { price: number; timestamp: string; index: number }[] = []

  for (let i = lookback; i < candles.length - lookback; i++) {
    if (isLocalHigh(candles, i, lookback)) {
      highs.push({ price: candles[i].high, timestamp: candles[i].timestamp, index: i })
    }
    if (isLocalLow(candles, i, lookback)) {
      lows.push({ price: candles[i].low, timestamp: candles[i].timestamp, index: i })
    }
  }

  const pivots: Pivot[] = []

  for (let i = 1; i < highs.length; i++) {
    pivots.push({
      type: highs[i].price > highs[i - 1].price ? 'HH' : 'LH',
      price: highs[i].price,
      timestamp: highs[i].timestamp,
      index: highs[i].index,
    })
  }

  for (let i = 1; i < lows.length; i++) {
    pivots.push({
      type: lows[i].price > lows[i - 1].price ? 'HL' : 'LL',
      price: lows[i].price,
      timestamp: lows[i].timestamp,
      index: lows[i].index,
    })
  }

  pivots.sort((a, b) => a.index - b.index)

  const recentPivots = pivots.slice(-6)
  const hhCount = recentPivots.filter((p) => p.type === 'HH').length
  const hlCount = recentPivots.filter((p) => p.type === 'HL').length
  const lhCount = recentPivots.filter((p) => p.type === 'LH').length
  const llCount = recentPivots.filter((p) => p.type === 'LL').length

  let trend: StructureTrend = 'neutral'
  if (hhCount + hlCount > lhCount + llCount) trend = 'bullish'
  else if (lhCount + llCount > hhCount + hlCount) trend = 'bearish'

  const lastHigh = highs.length > 0 ? highs[highs.length - 1].price : null
  const lastLow = lows.length > 0 ? lows[lows.length - 1].price : null

  return { pivots, trend, lastHigh, lastLow }
}
