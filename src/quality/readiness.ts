import type { DataQualityReport } from '@/types'

// ─── BOT READINESS SCORE ────────────────────────────────────
// Aggregates per-instrument quality reports into a single
// readiness score (0–1) that indicates whether market data
// is reliable enough for automated decision-making.

export interface ReadinessResult {
  score: number             // 0–1
  ready: boolean            // score >= threshold
  instrumentCount: number
  liveCount: number
  avgCompleteness: number
  avgFreshness: number
  avgReliability: number
  issues: string[]
}

const READINESS_THRESHOLD = 0.6

export const computeReadiness = (
  reports: Record<string, DataQualityReport>,
): ReadinessResult => {
  const entries = Object.values(reports)
  const n = entries.length

  if (n === 0) {
    return {
      score: 0,
      ready: false,
      instrumentCount: 0,
      liveCount: 0,
      avgCompleteness: 0,
      avgFreshness: 0,
      avgReliability: 0,
      issues: ['No instrument data available'],
    }
  }

  const liveCount = entries.filter((r) => r._status !== 'SIMULATED').length
  const avgCompleteness = entries.reduce((s, r) => s + r.completeness, 0) / n
  const avgFreshness = entries.reduce((s, r) => s + r.freshness, 0) / n
  const avgReliability = entries.reduce((s, r) => s + r.reliability, 0) / n
  const avgOverall = entries.reduce((s, r) => s + r.overallScore, 0) / n

  const issues: string[] = []
  if (liveCount === 0) issues.push('All data is simulated — no live feeds connected')
  if (avgCompleteness < 0.7) issues.push(`Low data completeness: ${(avgCompleteness * 100).toFixed(0)}%`)
  if (avgFreshness < 0.5) issues.push(`Stale data detected: freshness ${(avgFreshness * 100).toFixed(0)}%`)

  const lowQuality = entries.filter((r) => r.overallScore < 0.4)
  if (lowQuality.length > 0) {
    issues.push(`${lowQuality.length} instrument(s) with low quality score`)
  }

  return {
    score: avgOverall,
    ready: avgOverall >= READINESS_THRESHOLD && liveCount > 0,
    instrumentCount: n,
    liveCount,
    avgCompleteness,
    avgFreshness,
    avgReliability,
    issues,
  }
}
