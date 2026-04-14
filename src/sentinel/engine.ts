import type { TradeDecision, SentinelVeto, VetoReason } from '@/types/decision'
import type { AuditLogger } from '@/audit/logger'
import { DEFAULT_SENTINEL_RULES, type SentinelRules } from './rules'

export interface SentinelContext {
  /** Current drawdown as a percentage, e.g. 3.2 for 3.2%. */
  currentDrawdownPct: number
  /** Current total exposure as a percentage of account equity. */
  currentExposurePct: number
  /** Proposed position size as a percentage of equity. */
  positionSizePct: number
  /** Global data quality score in [0,1]. */
  dataQualityScore: number
  /** Age of the freshest data used to build the decision context. */
  dataAgeMs: number
  /** End-to-end context → decision latency. */
  latencyMs: number
  /** True if a broker is reachable and accepting orders. */
  brokerAvailable: boolean
  /** True if safe mode is currently active. */
  safeMode: boolean
  /** Optional multi-model consensus score in [0,1]. */
  consensusScore?: number | null
}

export interface SentinelEngineOptions {
  rules?: Partial<SentinelRules>
  audit?: AuditLogger
  now?: () => number
  idGen?: () => string
}

/**
 * Evaluates a TradeDecision against risk, quality, latency and broker rules.
 * Has absolute veto power — no execution ever bypasses this engine.
 */
export class SentinelEngine {
  private readonly rules: SentinelRules
  private readonly audit?: AuditLogger
  private readonly now: () => number
  private readonly idGen: () => string
  private seq = 0

  constructor(opts: SentinelEngineOptions = {}) {
    this.rules = { ...DEFAULT_SENTINEL_RULES, ...(opts.rules ?? {}) }
    this.audit = opts.audit
    this.now = opts.now ?? (() => Date.now())
    this.idGen =
      opts.idGen ??
      (() => `veto_${Date.now().toString(36)}_${(this.seq++).toString(36)}`)
  }

  evaluate(decision: TradeDecision, ctx: SentinelContext): SentinelVeto {
    this.audit?.log('sentinel', 'SENTINEL_CHECK', `checking ${decision.id}`, {
      decisionId: decision.id,
    })

    const reasons: VetoReason[] = []

    // HOLD decisions are informational — always approved, no checks.
    const isHold = decision.action === 'HOLD'

    if (!isHold) {
      if (ctx.safeMode) reasons.push('SAFE_MODE_ACTIVE')
      if (ctx.dataAgeMs > this.rules.maxDataAgeMs) reasons.push('DATA_TOO_OLD')
      if (ctx.dataQualityScore < this.rules.minDataQuality)
        reasons.push('DATA_QUALITY_LOW')
      if (ctx.latencyMs > this.rules.maxLatencyMs)
        reasons.push('LATENCY_TOO_HIGH')
      if (ctx.currentDrawdownPct > this.rules.maxDrawdownPct)
        reasons.push('DRAWDOWN_EXCEEDED')
      if (ctx.currentExposurePct > this.rules.maxExposurePct)
        reasons.push('EXPOSURE_EXCEEDED')
      if (ctx.positionSizePct > this.rules.maxPositionSizePct)
        reasons.push('SIZE_TOO_LARGE')
      if (decision.confidence < this.rules.minModelConfidence)
        reasons.push('MODEL_RESPONSE_INVALID')
      if (
        ctx.consensusScore !== undefined &&
        ctx.consensusScore !== null &&
        ctx.consensusScore < this.rules.minModelConfidence
      ) {
        reasons.push('MODEL_CONSENSUS_LOW')
      }
      if (this.rules.requireBrokerAvailable && !ctx.brokerAvailable)
        reasons.push('BROKER_UNAVAILABLE')
    }

    const approved = reasons.length === 0

    const veto: SentinelVeto = {
      id: this.idGen(),
      timestamp: this.now(),
      decisionId: decision.id,
      approved,
      vetoReasons: reasons,
      riskMetrics: {
        currentDrawdown: ctx.currentDrawdownPct,
        maxDrawdownLimit: this.rules.maxDrawdownPct,
        currentExposure: ctx.currentExposurePct,
        maxExposureLimit: this.rules.maxExposurePct,
        dataQualityScore: ctx.dataQualityScore,
        minDataQuality: this.rules.minDataQuality,
        latencyMs: ctx.latencyMs,
        maxLatencyMs: this.rules.maxLatencyMs,
        brokerAvailable: ctx.brokerAvailable,
      },
      safeMode: ctx.safeMode,
      _source: 'sentinel_engine',
    }

    if (approved) {
      this.audit?.log(
        'sentinel',
        'SENTINEL_APPROVED',
        `${decision.action} ${decision.symbol} approved`,
        { decisionId: decision.id, vetoId: veto.id },
      )
    } else {
      this.audit?.log(
        'sentinel',
        'SENTINEL_VETOED',
        `blocked: ${reasons.join(', ')}`,
        { decisionId: decision.id, vetoId: veto.id, reasons },
      )
    }

    return veto
  }
}
