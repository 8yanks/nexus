import type { OHLCV, CandleSeries } from '@/types'

// ─── RETURN TYPES ────────────────────────────────────────────

export interface BollingerBands {
  upper: number
  middle: number
  lower: number
  bandwidth: number   // (upper - lower) / middle, as a ratio
}

export interface DonchianChannel {
  upper: number
  middle: number
  lower: number
}

export interface AnalyticsResult {
  ema20: number | null
  ema50: number | null
  ema200: number | null
  rsi: number | null
  atr: number | null
  vwap: number | null
  bollinger: BollingerBands | null
  donchian: DonchianChannel | null
  zScore: number | null
  relativeVolume: number | null
  _source: string
  computedAt: string
}

// ─── PURE INDICATOR FUNCTIONS ────────────────────────────────

export const calcEMA = (data: number[], period: number): number | null => {
  if (data.length < period) return null
  const k = 2 / (period + 1)
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k)
  }
  return ema
}

/**
 * Rolling EMA — returns an array the same length as `data`, with
 * `null` for the positions that don't yet have enough history. Used
 * by chart overlays where we want one EMA value per candle.
 *
 * The seed EMA[period-1] is the SMA of the first `period` values,
 * matching `calcEMA`. After the seed, standard exponential update.
 */
export const calcEMASeries = (
  data: number[],
  period: number,
): Array<number | null> => {
  const out: Array<number | null> = new Array(data.length).fill(null)
  if (period <= 0 || data.length < period) return out

  const k = 2 / (period + 1)
  let sum = 0
  for (let i = 0; i < period; i++) sum += data[i]
  let ema = sum / period
  out[period - 1] = ema
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k)
    out[i] = ema
  }
  return out
}

export const calcRSI = (closes: number[], period = 14): number | null => {
  if (closes.length < period + 1) return null
  let gains = 0
  let losses = 0
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1]
    if (d > 0) gains += d
    else losses -= d
  }
  const rs = gains / (losses || 1e-10)
  return 100 - 100 / (1 + rs)
}

export const calcATR = (candles: OHLCV[], period = 14): number | null => {
  if (candles.length < period + 1) return null
  const trs = candles
    .slice(-period - 1)
    .map((c, i, arr) => {
      if (i === 0) return 0
      const prev = arr[i - 1]
      return Math.max(
        c.high - c.low,
        Math.abs(c.high - prev.close),
        Math.abs(c.low - prev.close),
      )
    })
    .slice(1)
  return trs.reduce((a, b) => a + b, 0) / trs.length
}

export const calcVWAP = (candles: OHLCV[]): number | null => {
  if (candles.length === 0) return null
  let sumPV = 0
  let sumV = 0
  for (const c of candles) {
    const typical = (c.high + c.low + c.close) / 3
    sumPV += typical * c.volume
    sumV += c.volume
  }
  return sumV === 0 ? null : sumPV / sumV
}

export const calcBollinger = (
  closes: number[],
  period = 20,
  mult = 2,
): BollingerBands | null => {
  if (closes.length < period) return null
  const slice = closes.slice(-period)
  const mean = slice.reduce((a, b) => a + b, 0) / period
  const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period
  const sd = Math.sqrt(variance)
  return {
    upper: mean + mult * sd,
    middle: mean,
    lower: mean - mult * sd,
    bandwidth: mean === 0 ? 0 : (mult * sd * 2) / mean,
  }
}

/**
 * Rolling Bollinger Bands — returns one `BollingerBands | null` entry
 * per input position, with `null` for positions before the seed window
 * (`period - 1`). Used by chart overlays where we want to plot the
 * three bands as continuous lines rather than a single snapshot value.
 *
 * Implementation uses a sliding-window sum + sum-of-squares, so the
 * whole series runs in O(n) regardless of `period`. Variance is
 * computed as E[X²] − (E[X])² to avoid re-iterating the window.
 *
 * Flat input (zero variance) produces all three bands collapsed onto
 * the mean — callers can still plot them without special-casing.
 * Non-positive `period` or `mult` produces an all-null series.
 */
export const calcBollingerSeries = (
  closes: number[],
  period = 20,
  mult = 2,
): Array<BollingerBands | null> => {
  const out: Array<BollingerBands | null> = new Array(closes.length).fill(null)
  if (period <= 0 || mult <= 0 || closes.length < period) return out

  let sum = 0
  let sumSq = 0
  for (let i = 0; i < period; i++) {
    sum += closes[i]
    sumSq += closes[i] * closes[i]
  }

  const compute = (s: number, sq: number): BollingerBands => {
    const mean = s / period
    // Clamp negative variance from float drift to 0 — can happen when
    // all values in the window are identical and the E[X²] − E[X]²
    // identity loses precision.
    const variance = Math.max(0, sq / period - mean * mean)
    const sd = Math.sqrt(variance)
    return {
      upper: mean + mult * sd,
      middle: mean,
      lower: mean - mult * sd,
      bandwidth: mean === 0 ? 0 : (mult * sd * 2) / mean,
    }
  }

  out[period - 1] = compute(sum, sumSq)
  for (let i = period; i < closes.length; i++) {
    const drop = closes[i - period]
    const add = closes[i]
    sum += add - drop
    sumSq += add * add - drop * drop
    out[i] = compute(sum, sumSq)
  }
  return out
}

export const calcDonchian = (
  candles: OHLCV[],
  period = 20,
): DonchianChannel | null => {
  if (candles.length < period) return null
  const slice = candles.slice(-period)
  const upper = Math.max(...slice.map((c) => c.high))
  const lower = Math.min(...slice.map((c) => c.low))
  return { upper, lower, middle: (upper + lower) / 2 }
}

export const calcZScore = (
  values: number[],
  period = 20,
): number | null => {
  if (values.length < period) return null
  const slice = values.slice(-period)
  const mean = slice.reduce((a, b) => a + b, 0) / period
  const sd = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period)
  if (sd === 0) return 0
  return (slice[slice.length - 1] - mean) / sd
}

export const calcRelativeVolume = (
  volumes: number[],
  period = 20,
): number | null => {
  if (volumes.length < period + 1) return null
  const avg =
    volumes.slice(-period - 1, -1).reduce((a, b) => a + b, 0) / period
  return avg === 0 ? 0 : volumes[volumes.length - 1] / avg
}

// ─── COMPOSITE COMPUTE ───────────────────────────────────────

export const computeAnalytics = (series: CandleSeries): AnalyticsResult | null => {
  if (!series || series.candles.length < 30) return null
  const closes = series.candles.map((c) => c.close)
  const volumes = series.candles.map((c) => c.volume)
  return {
    ema20: calcEMA(closes, 20),
    ema50: calcEMA(closes, 50),
    ema200: calcEMA(closes, 200),
    rsi: calcRSI(closes),
    atr: calcATR(series.candles),
    vwap: calcVWAP(series.candles),
    bollinger: calcBollinger(closes),
    donchian: calcDonchian(series.candles),
    zScore: calcZScore(closes),
    relativeVolume: calcRelativeVolume(volumes),
    _source: 'analytics_engine',
    computedAt: new Date().toISOString(),
  }
}
