export interface SentinelRules {
  maxDrawdownPct: number
  maxExposurePct: number
  maxPositionSizePct: number
  minDataQuality: number
  maxDataAgeMs: number
  maxLatencyMs: number
  maxDailyLoss: number
  maxDailyTrades: number
  minModelConfidence: number
  requireBrokerAvailable: boolean
  requireHumanReviewAbove: number
}

export const DEFAULT_SENTINEL_RULES: SentinelRules = {
  maxDrawdownPct: 5,
  maxExposurePct: 20,
  maxPositionSizePct: 5,
  minDataQuality: 0.6,
  maxDataAgeMs: 30_000,
  maxLatencyMs: 5_000,
  maxDailyLoss: 500,
  maxDailyTrades: 20,
  minModelConfidence: 0.6,
  requireBrokerAvailable: true,
  requireHumanReviewAbove: 0.5,
}
