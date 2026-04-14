import type { TradeDecision } from '@/types/decision'
import type { PaperOrder } from '@/types/order'
import type { AuditLogger } from '@/audit/logger'
import { AIOrchestrator } from '@/ai/orchestrator'
import { SentinelEngine, type SentinelContext } from '@/sentinel/engine'
import { TraderEngine } from '@/trader/engine'
import type { ValidationError } from '@/ai/schemas'

export type ChainOutcome =
  | { stage: 'ai_rejected'; errors: ValidationError[]; raw: unknown }
  | { stage: 'sentinel_vetoed'; decision: TradeDecision; reasons: string[] }
  | {
      stage: 'order_rejected'
      decision: TradeDecision
      reason: string
    }
  | { stage: 'filled'; decision: TradeDecision; order: PaperOrder }

export interface DecisionChainOptions {
  ai: AIOrchestrator
  sentinel: SentinelEngine
  trader: TraderEngine
  audit?: AuditLogger
}

/**
 * End-to-end pipeline: Analyst context → AI → Sentinel → Trader.
 * Every stage writes to the audit trail. Nothing exits the chain without a
 * typed outcome; no free-form text ever reaches the Trader.
 */
export class DecisionChain {
  constructor(private readonly opts: DecisionChainOptions) {}

  async run(
    contextHash: string,
    context: Record<string, unknown>,
    sentinelCtx: SentinelContext,
  ): Promise<ChainOutcome> {
    const audit = this.opts.audit
    audit?.log('system', 'CONTEXT_BUILT', 'chain start', { contextHash })

    const ai = await this.opts.ai.decide(contextHash, context)
    if (!ai.ok) {
      return { stage: 'ai_rejected', errors: ai.errors, raw: ai.raw }
    }

    const veto = this.opts.sentinel.evaluate(ai.decision, sentinelCtx)
    if (!veto.approved) {
      return {
        stage: 'sentinel_vetoed',
        decision: ai.decision,
        reasons: veto.vetoReasons,
      }
    }

    const res = this.opts.trader.execute(ai.decision, veto)
    if (!res.ok) {
      return {
        stage: 'order_rejected',
        decision: ai.decision,
        reason: res.reason,
      }
    }
    return { stage: 'filled', decision: ai.decision, order: res.order }
  }
}
