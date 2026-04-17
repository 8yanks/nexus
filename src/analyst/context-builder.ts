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
 * Deterministic 64-bit FNV-1a variant (two 32-bit lanes) for the context
 * payload. Strong enough that two identical inputs collide while distinct
 * snapshots — even with matching id + timestamp — diverge. Lets the AI
 * orchestrator + audit trail correlate identical inputs across retries.
 */
const hash = (s: string): string => {
  let h1 = 0x811c9dc5
  let h2 = 0x1b873593
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0
    h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0
  }
  const lo = h1.toString(36).padStart(7, '0')
  const hi = h2.toString(36).padStart(7, '0')
  return `ctx_${hi}${lo}`
}

export function buildAnalystContext(input: BuildContextInput): AnalystContext {
  const now = input.now ?? Date.now
  const t = now()
  // Stable signal digest: id|direction|strength (rounded to 3 decimals for
  // noise tolerance). Order sensitive — caller is expected to pass signals
  // in a deterministic order.
  const sigDigest = input.signals
    .map((s) => `${s.id}:${s.direction}:${s.strength.toFixed(3)}`)
    .join(',')
  const qualityDigest = input.quality
    ? `${input.quality.overallScore.toFixed(2)}:${input.quality._status}`
    : 'none'
  const snapTs = input.snapshot._provenance?.timestamp ?? ''
  const payload =
    `${input.snapshot.instrumentId}|${snapTs}` +
    `|${input.snapshot.price.toFixed(6)}|${sigDigest}|${qualityDigest}`
  return {
    instrumentId: input.snapshot.instrumentId,
    symbol: input.symbol,
    price: input.snapshot.price,
    snapshot: input.snapshot,
    signals: input.signals,
    quality: input.quality,
    builtAt: t,
    contextHash: hash(payload),
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
  // Snapshot freshness comes from _provenance.timestamp (the canonical
  // source field on MarketSnapshot). Falls back to 0 ms when missing so
  // tests with synthetic snapshots don't trip the freshness rule.
  const snapTsRaw = ctx.snapshot._provenance?.timestamp
  const snapTs = snapTsRaw ? Date.parse(snapTsRaw) : NaN
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
