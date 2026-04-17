import type { TradeDecision } from '@/types/decision'
import type { AuditLogger } from '@/audit/logger'
import { validateTradeDecision, type ValidationError } from './schemas'

export interface AIProvider {
  id: string
  /** Produces a raw JSON-compatible value the orchestrator will validate. */
  propose(contextHash: string, context: Record<string, unknown>): Promise<unknown>
}

export type OrchestratorResult =
  | { ok: true; decision: TradeDecision }
  | { ok: false; errors: ValidationError[]; raw: unknown }

export interface OrchestratorOptions {
  audit?: AuditLogger
}

/**
 * Calls an AI provider, audits the raw response, validates it against the
 * TradeDecision schema, and either returns a typed decision or a structured
 * rejection. No free-form text ever reaches the trader.
 */
export class AIOrchestrator {
  private readonly provider: AIProvider
  private readonly opts: OrchestratorOptions

  constructor(provider: AIProvider, opts: OrchestratorOptions = {}) {
    this.provider = provider
    this.opts = opts
  }

  async decide(
    contextHash: string,
    context: Record<string, unknown>,
  ): Promise<OrchestratorResult> {
    const audit = this.opts.audit
    audit?.log('ai', 'AI_PROMPT_SENT', `${this.provider.id} prompted`, {
      contextHash,
      provider: this.provider.id,
    })

    let raw: unknown
    try {
      raw = await this.provider.propose(contextHash, context)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      audit?.log('ai', 'SYSTEM_ERROR', `${this.provider.id} threw`, {
        contextHash,
        error: msg,
      })
      return {
        ok: false,
        errors: [{ path: '$', message: `provider error: ${msg}` }],
        raw: null,
      }
    }

    audit?.log('ai', 'AI_RESPONSE_RAW', `${this.provider.id} responded`, {
      contextHash,
      raw,
    })

    const result = validateTradeDecision(raw)
    if (!result.ok) {
      audit?.log(
        'ai',
        'AI_RESPONSE_REJECTED',
        `${result.errors.length} schema error(s)`,
        { contextHash, errors: result.errors },
      )
      return { ok: false, errors: result.errors, raw }
    }

    audit?.log('ai', 'AI_RESPONSE_VALIDATED', 'decision conforms to schema', {
      contextHash,
      decisionId: result.value.id,
    })
    audit?.log(
      'ai',
      'DECISION_CREATED',
      `${result.value.action} ${result.value.symbol} size=${result.value.size}`,
      {
        decisionId: result.value.id,
        action: result.value.action,
        confidence: result.value.confidence,
      },
    )
    return { ok: true, decision: result.value }
  }
}
