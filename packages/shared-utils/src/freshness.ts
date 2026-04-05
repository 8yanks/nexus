// ─── FRESHNESS LEVELS ────────────────────────────────────────
// Based on age of a timestamp (seconds since last update)

export type FreshnessLevel = 'fresh' | 'ok' | 'stale' | 'dead'

export const FRESHNESS = {
  FRESH_THRESHOLD_S: 5,
  OK_THRESHOLD_S: 30,
  STALE_THRESHOLD_S: 300,   // 5 min
} as const

export interface FreshnessInfo {
  level: FreshnessLevel
  ageMs: number
  ageS: number
}

export const getFreshness = (iso: string | null | undefined): FreshnessInfo => {
  if (!iso) return { level: 'dead', ageMs: Infinity, ageS: Infinity }

  const ageMs = Date.now() - new Date(iso).getTime()
  const ageS = ageMs / 1000

  let level: FreshnessLevel
  if (ageS <= FRESHNESS.FRESH_THRESHOLD_S) level = 'fresh'
  else if (ageS <= FRESHNESS.OK_THRESHOLD_S) level = 'ok'
  else if (ageS <= FRESHNESS.STALE_THRESHOLD_S) level = 'stale'
  else level = 'dead'

  return { level, ageMs, ageS }
}

export const FRESHNESS_COLORS: Record<FreshnessLevel, string> = {
  fresh: '#00d4aa',
  ok: '#3b82f6',
  stale: '#ffaa22',
  dead: '#ff4466',
}
