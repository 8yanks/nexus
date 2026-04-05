// ─── SAFE NUMERIC UTILITIES ─────────────────────────────────
// Centralized guards against NaN, Infinity, division-by-zero.

/** Type guard: true if value is a finite number */
export const isValidNumber = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n)

/** Safe division — returns fallback if denominator is 0, NaN, or Infinity */
export const safeDivide = (
  numerator: number,
  denominator: number,
  fallback = 0,
): number => {
  if (!isValidNumber(numerator) || !isValidNumber(denominator) || denominator === 0) {
    return fallback
  }
  const result = numerator / denominator
  return isValidNumber(result) ? result : fallback
}

/** Clamp a number between min and max, returning fallback if not a valid number */
export const safeClamp = (n: number, min: number, max: number, fallback = 0): number => {
  if (!isValidNumber(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

/** Safe percentage: (part / whole) * 100, with fallback */
export const safePct = (part: number, whole: number, fallback = 0): number =>
  safeDivide(part, whole, fallback) * 100

/** Safe toFixed that never returns "NaN" or "Infinity" */
export const safeFixed = (n: number | null | undefined, decimals = 2, fallback = '—'): string => {
  if (n == null || !isValidNumber(n)) return fallback
  return n.toFixed(decimals)
}
