import type { OHLCV } from '@/types'

// ─── PERFORMANCE + MICROSTRUCTURE STATS ─────────────────────
// Pure helpers computed from the candle window the store already
// fetches (200 × 1h bars per instrument). Zero new network calls —
// the role of this module is to squeeze more insight out of the
// dataset we already have, so the Detail screen can start looking
// like a terminal instead of a single-figure drilldown.
//
// Every helper is defensive: the store can briefly hand us an empty
// or too-short candle array (warm-up, mock fallback) and we return
// `null` rather than crash. Downstream renderers branch on null to
// print an em-dash.

export interface PerformancePoint {
  label: string
  /** Number of bars back from the latest close. */
  barsBack: number
  /** Percent change (fraction, NOT %) from the close `barsBack` ago to now. */
  changePct: number | null
}

/**
 * Default performance windows for a 1h-bar candle stream — the
 * coarsest we can reasonably compute with 200 samples.
 * 1H ≈ 1 bar, 6H ≈ 6, 1D ≈ 24, 3D ≈ 72, 7D ≈ 168. 7D is the
 * longest window that fits inside a 200-bar buffer.
 */
export const DEFAULT_WINDOWS: ReadonlyArray<{ label: string; barsBack: number }> = [
  { label: '1H',  barsBack: 1 },
  { label: '6H',  barsBack: 6 },
  { label: '1D',  barsBack: 24 },
  { label: '3D',  barsBack: 72 },
  { label: '7D',  barsBack: 168 },
]

/**
 * For each window, compute (lastClose - windowClose) / windowClose.
 * Returns null when we have fewer bars than the window asks for —
 * the UI renders those as em-dashes rather than faking a zero.
 */
export const computePerformance = (
  candles: OHLCV[],
  windows: ReadonlyArray<{ label: string; barsBack: number }> = DEFAULT_WINDOWS,
): PerformancePoint[] => {
  if (!candles.length) {
    return windows.map((w) => ({ ...w, changePct: null }))
  }
  const last = candles[candles.length - 1].close
  if (!Number.isFinite(last) || last <= 0) {
    return windows.map((w) => ({ ...w, changePct: null }))
  }

  return windows.map((w) => {
    // We need `barsBack` bars before the last one → index = length - 1 - barsBack.
    const idx = candles.length - 1 - w.barsBack
    if (idx < 0) return { ...w, changePct: null }
    const ref = candles[idx].close
    if (!Number.isFinite(ref) || ref <= 0) return { ...w, changePct: null }
    return { ...w, changePct: (last - ref) / ref }
  })
}

// ─── KEY MICROSTRUCTURE STATS ───────────────────────────────

export interface KeyStats {
  /** Position of `price` inside the 24h low→high range, 0..1. Null if range is flat. */
  rangePosition24h: number | null
  /** Highest close in the candle window. */
  athWindow: number | null
  /** Lowest close in the candle window. */
  atlWindow: number | null
  /** Current bar volume divided by the mean of the previous N bars. */
  relativeVolume: number | null
  /** Number of bars used as the relative-volume baseline. */
  relativeVolumeBase: number
}

export const computeKeyStats = (
  candles: OHLCV[],
  price: number | null,
  low24h: number | null,
  high24h: number | null,
  volumeBaselineBars = 30,
): KeyStats => {
  // 24h range position — a TradingView-style progress indicator.
  // Flat range (low == high) has no meaningful position; leave null.
  // Inputs may be null when the snapshot hasn't seeded 24h stats yet —
  // the explicit null + Number.isFinite gates handle that uniformly with NaN.
  let rangePosition24h: number | null = null
  if (
    price != null && low24h != null && high24h != null &&
    Number.isFinite(price) && Number.isFinite(low24h) && Number.isFinite(high24h)
  ) {
    const span = high24h - low24h
    if (span > 0) {
      const clamped = Math.max(0, Math.min(1, (price - low24h) / span))
      rangePosition24h = clamped
    }
  }

  // Window ATH/ATL — high of highs, low of lows over the candle window.
  let athWindow: number | null = null
  let atlWindow: number | null = null
  if (candles.length) {
    let hi = -Infinity
    let lo = Infinity
    for (const c of candles) {
      if (c.high > hi) hi = c.high
      if (c.low  < lo) lo = c.low
    }
    if (Number.isFinite(hi)) athWindow = hi
    if (Number.isFinite(lo)) atlWindow = lo
  }

  // Relative volume — last bar vs mean of the preceding `volumeBaselineBars`.
  // Skip if we don't have enough history for a meaningful baseline.
  let relativeVolume: number | null = null
  const base = Math.min(volumeBaselineBars, Math.max(0, candles.length - 1))
  if (base > 0) {
    const lastVol = candles[candles.length - 1].volume
    let sum = 0
    for (let i = candles.length - 1 - base; i < candles.length - 1; i++) {
      sum += candles[i].volume
    }
    const avg = sum / base
    if (avg > 0 && Number.isFinite(lastVol)) {
      relativeVolume = lastVol / avg
    }
  }

  return {
    rangePosition24h,
    athWindow,
    atlWindow,
    relativeVolume,
    relativeVolumeBase: base,
  }
}
