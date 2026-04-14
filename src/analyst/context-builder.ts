import type { MarketSnapshot } from '@/types/market'
import type { DataQualityReport } from '@/types/quality'
import type { SignalEvent } from '@/types/signal'
import type { SentinelContext } from '@/sentinel/engine'

export interface AnalystContext {
  instrumentId: string
  symbol: string
  price: number
  snapshot: MarketSnapshot
  signals: SignalEvent[]
  quality: DataQualityReport | null
  contextHash: string
  builtAt: number
}

export interface BuildContextInput {
  snapshot: MarketSnapshot
  signals: SignalEvent[]
  quality: DataQualityReport | null
  symbol: string
  now?: () => number
}

/**
 * Deterministic hash for a context payload. Lets AI orchestrator + audit
 * trail correlate identical inputs across retries.
 */
const hash = (s: string): string => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return `ctx_${(h >>> 0).toString(36)}`
}

export function buildAnalystContext(input: BuildContextInput): AnalystContext {
  const now = input.now ?? Date.now
  const t = now()
  const sigIds = input.signals.map((s) => s.id).join(',')
  return {
    instrumentId: input.snapshot.instrumentId,
    symbol: input.symbol,
    price: input.snapshot.price,
    snapshot: input.snapshot,
    signals: input.signals,
    quality: input.quality,
    builtAt: t,
    contextHash: hash(`${input.snapshot.instrumentId}|${input.snapshot.timestamp}|${sigIds}`),
  }
}

export interface RiskPosture {
  currentDrawdownPct: number
  currentExposurePct: number
  positionSizePct: number
  brokerAvailable: boolean
  safeMode: boolean
}

/**
 * Derives a SentinelContext from a built AnalystContext + current account
 * posture. Data quality and freshness come straight from the Analyst layer;
 * risk/exposure must be supplied by the portfolio state.
 */
export function toSentinelContext(
  ctx: AnalystContext,
  posture: RiskPosture,
  now: () => number = Date.now,
): SentinelContext {
  const snapTs = Date.parse(ctx.snapshot.timestamp)
  const dataAgeMs = Number.isFinite(snapTs) ? Math.max(0, now() - snapTs) : 0
  const latencyMs = Math.max(0, now() - ctx.builtAt)
  const dataQualityScore = ctx.quality?.overallScore ?? 0
  return {
    currentDrawdownPct: posture.currentDrawdownPct,
    currentExposurePct: posture.currentExposurePct,
    positionSizePct: posture.positionSizePct,
    dataQualityScore,
    dataAgeMs,
    latencyMs,
    brokerAvailable: posture.brokerAvailable,
    safeMode: posture.safeMode,
  }
}
