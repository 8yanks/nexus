// ─── RETURN TYPES ────────────────────────────────────────────

export type VolatilityRegime = 'compression' | 'normal' | 'expansion'

export interface VolatilityResult {
  regime: VolatilityRegime
  atrZScore: number | null
  normalizedAtr: number | null   // ATR / price (as %)
}

// ─── DETECT VOLATILITY REGIME ────────────────────────────────
// Uses ATR history to compute z-score of current ATR.
// compression: z-score < -1 (ATR well below average)
// expansion:   z-score >  1 (ATR well above average)
// normal:      otherwise

export const detectVolatilityRegime = (
  atrSeries: number[],
  period = 20,
  currentPrice: number | null = null,
): VolatilityResult => {
  if (atrSeries.length < period) {
    return { regime: 'normal', atrZScore: null, normalizedAtr: null }
  }

  const slice = atrSeries.slice(-period)
  const current = slice[slice.length - 1]
  const mean = slice.reduce((a, b) => a + b, 0) / period
  const sd = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period)

  const atrZScore = sd === 0 ? 0 : (current - mean) / sd

  let regime: VolatilityRegime = 'normal'
  if (atrZScore < -1) regime = 'compression'
  else if (atrZScore > 1) regime = 'expansion'

  const normalizedAtr =
    currentPrice != null && currentPrice > 0
      ? (current / currentPrice) * 100
      : null

  return { regime, atrZScore, normalizedAtr }
}
