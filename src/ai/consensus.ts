// ─── AI CONSENSUS ───────────────────────────────────────────
// Aggregates N independent AIProviders into one. Each provider runs in
// parallel; the orchestrator validates each response separately. The
// consensus rule:
//   - Single provider → passthrough (consensusScore = its confidence).
//   - All providers agree on action → emit a synthesised decision with
//     mean confidence and consensusScore = same mean.
//   - Providers disagree → emit a HOLD decision with low confidence and a
//     consensusScore = (max-vote-share) so the operator can see the split.
//
// Validation errors from any single provider don't poison the consensus —
// they're logged and the remaining providers vote. If *zero* providers
// produce a valid decision, the consensus result is itself a rejection.

import type { TradeDecision, DecisionAction } from '@/types/decision'
import type { AuditLogger } from '@/audit/logger'
import { validateTradeDecision, type ValidationError } from './schemas'
import type { AIProvider, OrchestratorResult } from './orchestrator'

export interface ConsensusOptions {
  audit?: AuditLogger
  /**
   * Minimum vote share (0..1) on the winning action for the consensus to
   * fire that action. Below this, the consensus emits HOLD. Default 0.5.
   */
  minAgreement?: number
}

export interface ConsensusProviderOptions {
  providers: AIProvider[]
  /** Tag for audit / decision.modelSource. */
  id?: string
  /** Used to mint the synthesised decision id; default Date.now-based. */
  idGen?: () => string
}

interface VoteEntry {
  providerId: string
  decision: TradeDecision
}

const meanConfidence = (votes: VoteEntry[]): number => {
  if (votes.length === 0) return 0
  return votes.reduce((s, v) => s + v.decision.confidence, 0) / votes.length
}

/**
 * Wraps an AIOrchestrator-shaped facade around N providers and a voting
 * rule. Returns the same OrchestratorResult shape so callers (DecisionChain)
 * don't need to know whether they're talking to one model or many.
 */
export class ConsensusOrchestrator {
  private readonly providers: AIProvider[]
  private readonly id: string
  private readonly minAgreement: number
  private readonly audit?: AuditLogger
  private readonly idGen: () => string
  private seq = 0

  constructor(opts: ConsensusProviderOptions & ConsensusOptions) {
    if (opts.providers.length === 0) {
      throw new Error('ConsensusOrchestrator requires at least one provider')
    }
    this.providers = opts.providers
    this.id = opts.id ?? `consensus[${opts.providers.map((p) => p.id).join('+')}]`
    this.minAgreement = opts.minAgreement ?? 0.5
    this.audit = opts.audit
    this.idGen =
      opts.idGen ??
      (() => `dec_consensus_${Date.now().toString(36)}_${(this.seq++).toString(36)}`)
  }

  async decide(
    contextHash: string,
    context: Record<string, unknown>,
  ): Promise<OrchestratorResult> {
    this.audit?.log('ai', 'AI_PROMPT_SENT', `${this.id} prompted`, {
      contextHash,
      providers: this.providers.map((p) => p.id),
    })

    // Run all providers in parallel; collect successes and validation errors.
    const settled = await Promise.allSettled(
      this.providers.map(async (p) => ({
        providerId: p.id,
        raw: await p.propose(contextHash, context),
      })),
    )

    const votes: VoteEntry[] = []
    const errors: ValidationError[] = []

    for (let i = 0; i < settled.length; i++) {
      const s = settled[i]
      const providerId = this.providers[i].id
      if (s.status === 'rejected') {
        const msg = s.reason instanceof Error ? s.reason.message : String(s.reason)
        this.audit?.log('ai', 'SYSTEM_ERROR', `${providerId} threw`, {
          contextHash,
          error: msg,
        })
        errors.push({ path: providerId, message: `provider error: ${msg}` })
        continue
      }
      const v = validateTradeDecision(s.value.raw)
      if (!v.ok) {
        this.audit?.log(
          'ai',
          'AI_RESPONSE_REJECTED',
          `${providerId} ${v.errors.length} schema error(s)`,
          { contextHash, providerId, errors: v.errors },
        )
        for (const e of v.errors) {
          errors.push({ path: `${providerId}.${e.path}`, message: e.message })
        }
        continue
      }
      this.audit?.log(
        'ai',
        'AI_RESPONSE_VALIDATED',
        `${providerId} validated`,
        { contextHash, providerId, decisionId: v.value.id },
      )
      votes.push({ providerId, decision: v.value })
    }

    if (votes.length === 0) {
      return { ok: false, errors, raw: null }
    }

    // Single-provider: passthrough, but stamp consensusScore so downstream
    // code (Sentinel) sees a uniform shape.
    if (votes.length === 1) {
      const only = votes[0].decision
      const decision: TradeDecision = {
        ...only,
        consensusScore: only.confidence,
        modelSource: this.id,
      }
      this.audit?.log('ai', 'DECISION_CREATED', `single ${decision.action}`, {
        decisionId: decision.id,
        consensusScore: decision.consensusScore,
      })
      return { ok: true, decision }
    }

    // Tally action votes.
    const tally = new Map<DecisionAction, VoteEntry[]>()
    for (const v of votes) {
      const key = v.decision.action
      const arr = tally.get(key) ?? []
      arr.push(v)
      tally.set(key, arr)
    }
    let winner: DecisionAction = 'HOLD'
    let winnerVotes: VoteEntry[] = []
    for (const [action, arr] of tally) {
      if (arr.length > winnerVotes.length) {
        winner = action
        winnerVotes = arr
      }
    }
    const share = winnerVotes.length / votes.length
    const meets = share >= this.minAgreement && winner !== 'HOLD'

    if (!meets) {
      // No agreement → emit HOLD with the disagreement encoded in confidence.
      const dec = synthesiseHold({
        contextHash,
        votes,
        share,
        idGen: this.idGen,
        modelSource: this.id,
        sample: votes[0].decision,
      })
      this.audit?.log(
        'ai',
        'DECISION_CREATED',
        `consensus HOLD (split ${share.toFixed(2)})`,
        { decisionId: dec.id, consensusScore: dec.consensusScore },
      )
      return { ok: true, decision: dec }
    }

    // Agreement → synthesise a decision from the winning votes.
    const decision = synthesiseAgreed({
      contextHash,
      votes: winnerVotes,
      action: winner,
      share,
      idGen: this.idGen,
      modelSource: this.id,
    })
    this.audit?.log(
      'ai',
      'DECISION_CREATED',
      `consensus ${winner} (share ${share.toFixed(2)})`,
      { decisionId: decision.id, consensusScore: decision.consensusScore },
    )
    return { ok: true, decision }
  }
}

function synthesiseHold(args: {
  contextHash: string
  votes: VoteEntry[]
  share: number
  idGen: () => string
  modelSource: string
  sample: TradeDecision
}): TradeDecision {
  const conf = Math.min(0.4, args.share * 0.5)
  return {
    ...args.sample,
    id: args.idGen(),
    timestamp: Date.now(),
    action: 'HOLD',
    size: 0,
    entryPrice: null,
    stopLoss: null,
    takeProfit: null,
    confidence: conf,
    riskLevel: 'low',
    horizon: 'intraday',
    thesis: `consensus split (${args.share.toFixed(2)} agreement) — holding`,
    keyFactors: args.votes.map((v) => `${v.providerId}:${v.decision.action}`),
    invalidators: [],
    requiresHumanReview: true,
    modelSource: args.modelSource,
    consensusScore: args.share,
    _source: 'ai_consensus',
    _status: 'LIVE',
    _contextHash: args.contextHash,
  }
}

function synthesiseAgreed(args: {
  contextHash: string
  votes: VoteEntry[]
  action: DecisionAction
  share: number
  idGen: () => string
  modelSource: string
}): TradeDecision {
  // Average the numeric fields across the winning votes; for nullable
  // price fields, pick the median-ish (sort + middle) when populated.
  const sample = args.votes[0].decision
  const meanConf = meanConfidence(args.votes)
  const meanSize =
    args.votes.reduce((s, v) => s + v.decision.size, 0) / args.votes.length
  const median = (
    pick: (d: TradeDecision) => number | null,
  ): number | null => {
    const xs = args.votes
      .map((v) => pick(v.decision))
      .filter((x): x is number => typeof x === 'number')
    if (xs.length === 0) return null
    xs.sort((a, b) => a - b)
    return xs[Math.floor(xs.length / 2)]
  }

  return {
    ...sample,
    id: args.idGen(),
    timestamp: Date.now(),
    action: args.action,
    size: meanSize,
    entryPrice: median((d) => d.entryPrice),
    stopLoss: median((d) => d.stopLoss),
    takeProfit: median((d) => d.takeProfit),
    confidence: meanConf,
    requiresHumanReview: meanConf < 0.6 || args.share < 1,
    modelSource: args.modelSource,
    consensusScore: args.share,
    thesis: args.votes.map((v) => `[${v.providerId}] ${v.decision.thesis}`).join(' | '),
    keyFactors: dedupe(args.votes.flatMap((v) => v.decision.keyFactors)),
    invalidators: dedupe(args.votes.flatMap((v) => v.decision.invalidators)),
    _source: 'ai_consensus',
    _contextHash: args.contextHash,
  }
}

const dedupe = <T>(arr: T[]): T[] => Array.from(new Set(arr))
