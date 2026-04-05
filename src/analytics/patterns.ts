import type { OHLCV } from '@/types'
import { safeDivide, safeClamp } from '@/utils/math'

// ─── PATTERN TYPES ──────────────────────────────────────────

export type PatternType =
  | 'DOUBLE_TOP'
  | 'DOUBLE_BOTTOM'
  | 'HEAD_AND_SHOULDERS'
  | 'INVERSE_HEAD_AND_SHOULDERS'
  | 'ASCENDING_TRIANGLE'
  | 'DESCENDING_TRIANGLE'

export type PatternDirection = 'bullish' | 'bearish'

export interface DetectedPattern {
  type: PatternType
  direction: PatternDirection
  confidence: number          // 0–1
  startIndex: number
  endIndex: number
  neckline: number
  description: string
  keyPoints: { index: number; price: number; label: string }[]
}

// ─── PIVOT DETECTION (local to this module) ─────────────────

interface LocalPivot {
  index: number
  price: number
  kind: 'high' | 'low'
}

const findPivots = (candles: OHLCV[], lookback = 5): LocalPivot[] => {
  const pivots: LocalPivot[] = []

  for (let i = lookback; i < candles.length - lookback; i++) {
    let isHigh = true
    let isLow = true
    const h = candles[i].high
    const l = candles[i].low

    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue
      if (candles[j].high >= h) isHigh = false
      if (candles[j].low <= l) isLow = false
    }

    if (isHigh) pivots.push({ index: i, price: h, kind: 'high' })
    if (isLow) pivots.push({ index: i, price: l, kind: 'low' })
  }

  return pivots
}

const getHighPivots = (pivots: LocalPivot[]): LocalPivot[] =>
  pivots.filter((p) => p.kind === 'high')

const getLowPivots = (pivots: LocalPivot[]): LocalPivot[] =>
  pivots.filter((p) => p.kind === 'low')

// ─── SIMILARITY CHECK ───────────────────────────────────────
// Two prices are "similar" if they're within `tolerance` of each other

const similar = (a: number, b: number, tolerance = 0.015): boolean => {
  const denom = Math.max(a, b)
  if (denom === 0) return a === b
  return Math.abs(a - b) / denom <= tolerance
}

// ─── DOUBLE TOP ─────────────────────────────────────────────
// Two peaks at similar levels with a valley in between.
// Bearish: price fails to break above resistance twice.

const detectDoubleTop = (
  candles: OHLCV[],
  highs: LocalPivot[],
  lows: LocalPivot[],
): DetectedPattern | null => {
  if (highs.length < 2) return null

  // Check the last 2 highs
  for (let i = highs.length - 1; i >= 1; i--) {
    const peak2 = highs[i]
    const peak1 = highs[i - 1]

    if (!similar(peak1.price, peak2.price, 0.02)) continue
    if (peak2.index - peak1.index < 5) continue // too close

    // Find the lowest low between the two peaks
    const between = lows.filter(
      (l) => l.index > peak1.index && l.index < peak2.index,
    )
    if (between.length === 0) continue

    const valley = between.reduce((a, b) => (a.price < b.price ? a : b))
    const neckline = valley.price
    const currentPrice = candles[candles.length - 1].close

    // Confidence based on: symmetry, depth, and current price near/below neckline
    const symmetry = 1 - safeDivide(Math.abs(peak1.price - peak2.price), peak1.price, 0)
    const depth = safeDivide(peak1.price - neckline, peak1.price, 0)
    const breakdown = currentPrice < neckline ? 0.3 : 0

    const rawConf = symmetry * 0.4 + Math.min(depth * 10, 0.3) + breakdown
    const confidence = safeClamp(rawConf, 0, 1, 0)

    if (confidence < 0.3) continue

    return {
      type: 'DOUBLE_TOP',
      direction: 'bearish',
      confidence,
      startIndex: peak1.index,
      endIndex: peak2.index,
      neckline,
      description: `Double Top at ~${peak1.price.toFixed(2)} — neckline at ${neckline.toFixed(2)}`,
      keyPoints: [
        { index: peak1.index, price: peak1.price, label: 'Peak 1' },
        { index: valley.index, price: valley.price, label: 'Valley' },
        { index: peak2.index, price: peak2.price, label: 'Peak 2' },
      ],
    }
  }
  return null
}

// ─── DOUBLE BOTTOM ──────────────────────────────────────────
// Two troughs at similar levels with a peak in between.
// Bullish: price holds support twice.

const detectDoubleBottom = (
  candles: OHLCV[],
  highs: LocalPivot[],
  lows: LocalPivot[],
): DetectedPattern | null => {
  if (lows.length < 2) return null

  for (let i = lows.length - 1; i >= 1; i--) {
    const trough2 = lows[i]
    const trough1 = lows[i - 1]

    if (!similar(trough1.price, trough2.price, 0.02)) continue
    if (trough2.index - trough1.index < 5) continue

    const between = highs.filter(
      (h) => h.index > trough1.index && h.index < trough2.index,
    )
    if (between.length === 0) continue

    const peak = between.reduce((a, b) => (a.price > b.price ? a : b))
    const neckline = peak.price
    const currentPrice = candles[candles.length - 1].close

    const symmetry = 1 - safeDivide(Math.abs(trough1.price - trough2.price), trough1.price, 0)
    const depth = safeDivide(neckline - trough1.price, neckline, 0)
    const breakout = currentPrice > neckline ? 0.3 : 0

    const rawConf = symmetry * 0.4 + Math.min(depth * 10, 0.3) + breakout
    const confidence = safeClamp(rawConf, 0, 1, 0)

    if (confidence < 0.3) continue

    return {
      type: 'DOUBLE_BOTTOM',
      direction: 'bullish',
      confidence,
      startIndex: trough1.index,
      endIndex: trough2.index,
      neckline,
      description: `Double Bottom at ~${trough1.price.toFixed(2)} — neckline at ${neckline.toFixed(2)}`,
      keyPoints: [
        { index: trough1.index, price: trough1.price, label: 'Trough 1' },
        { index: peak.index, price: peak.price, label: 'Peak' },
        { index: trough2.index, price: trough2.price, label: 'Trough 2' },
      ],
    }
  }
  return null
}

// ─── HEAD & SHOULDERS ───────────────────────────────────────
// Three peaks: left shoulder, head (highest), right shoulder (~left level)
// With two valleys forming the neckline. Bearish reversal.

const detectHeadAndShoulders = (
  candles: OHLCV[],
  highs: LocalPivot[],
  lows: LocalPivot[],
): DetectedPattern | null => {
  if (highs.length < 3) return null

  for (let i = highs.length - 1; i >= 2; i--) {
    const rs = highs[i]       // right shoulder
    const head = highs[i - 1] // head
    const ls = highs[i - 2]   // left shoulder

    // Head must be the highest
    if (head.price <= ls.price || head.price <= rs.price) continue
    // Shoulders should be at similar levels
    if (!similar(ls.price, rs.price, 0.03)) continue
    // Minimum spacing
    if (rs.index - ls.index < 8) continue

    // Find valleys between LS-Head and Head-RS
    const valley1 = lows
      .filter((l) => l.index > ls.index && l.index < head.index)
      .reduce<LocalPivot | null>((a, b) => (!a || b.price < a.price ? b : a), null)

    const valley2 = lows
      .filter((l) => l.index > head.index && l.index < rs.index)
      .reduce<LocalPivot | null>((a, b) => (!a || b.price < a.price ? b : a), null)

    if (!valley1 || !valley2) continue

    const neckline = (valley1.price + valley2.price) / 2
    const currentPrice = candles[candles.length - 1].close

    const shoulderSymmetry = 1 - safeDivide(Math.abs(ls.price - rs.price), ls.price, 0)
    const headProminence = safeDivide(head.price - neckline, head.price, 0)
    const breakdown = currentPrice < neckline ? 0.3 : 0

    const rawConf = shoulderSymmetry * 0.3 + Math.min(headProminence * 5, 0.3) + breakdown + 0.1
    const confidence = safeClamp(rawConf, 0, 1, 0)

    if (confidence < 0.35) continue

    return {
      type: 'HEAD_AND_SHOULDERS',
      direction: 'bearish',
      confidence,
      startIndex: ls.index,
      endIndex: rs.index,
      neckline,
      description: `Head & Shoulders — head at ${head.price.toFixed(2)}, neckline at ${neckline.toFixed(2)}`,
      keyPoints: [
        { index: ls.index, price: ls.price, label: 'Left Shoulder' },
        { index: valley1.index, price: valley1.price, label: 'Valley 1' },
        { index: head.index, price: head.price, label: 'Head' },
        { index: valley2.index, price: valley2.price, label: 'Valley 2' },
        { index: rs.index, price: rs.price, label: 'Right Shoulder' },
      ],
    }
  }
  return null
}

// ─── INVERSE HEAD & SHOULDERS ───────────────────────────────
// Three troughs: left shoulder, head (lowest), right shoulder (~left level)
// Bullish reversal.

const detectInverseHeadAndShoulders = (
  candles: OHLCV[],
  highs: LocalPivot[],
  lows: LocalPivot[],
): DetectedPattern | null => {
  if (lows.length < 3) return null

  for (let i = lows.length - 1; i >= 2; i--) {
    const rs = lows[i]
    const head = lows[i - 1]
    const ls = lows[i - 2]

    // Head must be the lowest
    if (head.price >= ls.price || head.price >= rs.price) continue
    // Shoulders at similar levels
    if (!similar(ls.price, rs.price, 0.03)) continue
    if (rs.index - ls.index < 8) continue

    const peak1 = highs
      .filter((h) => h.index > ls.index && h.index < head.index)
      .reduce<LocalPivot | null>((a, b) => (!a || b.price > a.price ? b : a), null)

    const peak2 = highs
      .filter((h) => h.index > head.index && h.index < rs.index)
      .reduce<LocalPivot | null>((a, b) => (!a || b.price > a.price ? b : a), null)

    if (!peak1 || !peak2) continue

    const neckline = (peak1.price + peak2.price) / 2
    const currentPrice = candles[candles.length - 1].close

    const shoulderSymmetry = 1 - safeDivide(Math.abs(ls.price - rs.price), ls.price, 0)
    const headProminence = safeDivide(neckline - head.price, neckline, 0)
    const breakout = currentPrice > neckline ? 0.3 : 0

    const rawConf = shoulderSymmetry * 0.3 + Math.min(headProminence * 5, 0.3) + breakout + 0.1
    const confidence = safeClamp(rawConf, 0, 1, 0)

    if (confidence < 0.35) continue

    return {
      type: 'INVERSE_HEAD_AND_SHOULDERS',
      direction: 'bullish',
      confidence,
      startIndex: ls.index,
      endIndex: rs.index,
      neckline,
      description: `Inv. H&S — head at ${head.price.toFixed(2)}, neckline at ${neckline.toFixed(2)}`,
      keyPoints: [
        { index: ls.index, price: ls.price, label: 'Left Shoulder' },
        { index: peak1.index, price: peak1.price, label: 'Peak 1' },
        { index: head.index, price: head.price, label: 'Head' },
        { index: peak2.index, price: peak2.price, label: 'Peak 2' },
        { index: rs.index, price: rs.price, label: 'Right Shoulder' },
      ],
    }
  }
  return null
}

// ─── TRIANGLE DETECTION ─────────────────────────────────────
// Ascending: flat highs + rising lows (bullish)
// Descending: falling highs + flat lows (bearish)

const detectTriangles = (
  highs: LocalPivot[],
  lows: LocalPivot[],
): DetectedPattern | null => {
  if (highs.length < 3 || lows.length < 3) return null

  const recentHighs = highs.slice(-4)
  const recentLows = lows.slice(-4)

  // Slopes: positive = rising, negative = falling, ~0 = flat
  const highSlope = recentHighs.length >= 2
    ? (recentHighs[recentHighs.length - 1].price - recentHighs[0].price) /
      (recentHighs[recentHighs.length - 1].index - recentHighs[0].index)
    : 0

  const lowSlope = recentLows.length >= 2
    ? (recentLows[recentLows.length - 1].price - recentLows[0].price) /
      (recentLows[recentLows.length - 1].index - recentLows[0].index)
    : 0

  const avgPrice = (recentHighs[0].price + recentLows[0].price) / 2
  const normHighSlope = safeDivide(highSlope, avgPrice, 0)
  const normLowSlope = safeDivide(lowSlope, avgPrice, 0)

  const flatThreshold = 0.0003
  const risingThreshold = 0.0005

  // Ascending triangle: flat resistance + rising support
  if (Math.abs(normHighSlope) < flatThreshold && normLowSlope > risingThreshold) {
    const resistance = recentHighs.reduce((s, h) => s + h.price, 0) / recentHighs.length
    return {
      type: 'ASCENDING_TRIANGLE',
      direction: 'bullish',
      confidence: 0.55,
      startIndex: Math.min(recentHighs[0].index, recentLows[0].index),
      endIndex: Math.max(
        recentHighs[recentHighs.length - 1].index,
        recentLows[recentLows.length - 1].index,
      ),
      neckline: resistance,
      description: `Ascending Triangle — resistance at ${resistance.toFixed(2)}`,
      keyPoints: [
        ...recentHighs.map((h) => ({ index: h.index, price: h.price, label: 'Resistance' })),
        ...recentLows.map((l) => ({ index: l.index, price: l.price, label: 'Support' })),
      ],
    }
  }

  // Descending triangle: falling resistance + flat support
  if (normHighSlope < -risingThreshold && Math.abs(normLowSlope) < flatThreshold) {
    const support = recentLows.reduce((s, l) => s + l.price, 0) / recentLows.length
    return {
      type: 'DESCENDING_TRIANGLE',
      direction: 'bearish',
      confidence: 0.55,
      startIndex: Math.min(recentHighs[0].index, recentLows[0].index),
      endIndex: Math.max(
        recentHighs[recentHighs.length - 1].index,
        recentLows[recentLows.length - 1].index,
      ),
      neckline: support,
      description: `Descending Triangle — support at ${support.toFixed(2)}`,
      keyPoints: [
        ...recentHighs.map((h) => ({ index: h.index, price: h.price, label: 'Resistance' })),
        ...recentLows.map((l) => ({ index: l.index, price: l.price, label: 'Support' })),
      ],
    }
  }

  return null
}

// ─── MAIN DETECTOR ──────────────────────────────────────────
// Runs all pattern detectors on a candle array.
// Returns all detected patterns (may be empty).

export const detectPatterns = (
  candles: OHLCV[],
  lookback = 5,
): DetectedPattern[] => {
  if (candles.length < 30) return []

  const pivots = findPivots(candles, lookback)
  const highs = getHighPivots(pivots)
  const lows = getLowPivots(pivots)

  const patterns: DetectedPattern[] = []

  const dt = detectDoubleTop(candles, highs, lows)
  if (dt) patterns.push(dt)

  const db = detectDoubleBottom(candles, highs, lows)
  if (db) patterns.push(db)

  const hs = detectHeadAndShoulders(candles, highs, lows)
  if (hs) patterns.push(hs)

  const ihs = detectInverseHeadAndShoulders(candles, highs, lows)
  if (ihs) patterns.push(ihs)

  const tri = detectTriangles(highs, lows)
  if (tri) patterns.push(tri)

  return patterns
}

// Re-export findPivots for testing
export { findPivots }
