// ─── DECISION DRILLDOWN HELPERS ─────────────────────────────
// Pure logic for the decision drilldown modal. Correlates a decision with
// its downstream artefacts (veto, orders, position) and recovers per-provider
// theses from the consensus-orchestrator's concatenated thesis string.
//
// Kept outside the modal component so the correlation rules and the thesis
// parser are trivially unit-testable without JSDOM.

import type { TradeDecision, SentinelVeto } from '@/types/decision'
import type { PaperOrder } from '@/types/order'
import type { Position } from '@/types/position'
import type { AuditEntry } from '@/types/audit'
import { inspectConsensus, type ConsensusInfo } from './consensus-display'

export interface ProviderView {
  providerId: string
  /** Thesis for this provider when recoverable; null otherwise. */
  thesis: string | null
  /** Action voted by this provider when recoverable; null otherwise. */
  action: string | null
  /** Confidence voted by this provider when recoverable; null otherwise. */
  confidence: number | null
}

export interface DecisionDrilldown {
  decision: TradeDecision
  consensus: ConsensusInfo
  /** Per-provider breakdown. Empty when not a consensus decision or when
   *  nothing was recoverable (e.g. single-provider passthrough).          */
  providers: ProviderView[]
  veto: SentinelVeto | null
  orders: PaperOrder[]
  position: Position | null
  /** Audit entries whose data references this decision id. Empty when the
   *  caller didn't pass entries, or when none match (multi-provider
   *  consensus: per-provider validations carry the per-vote id, not the
   *  synthesised id, so they won't match here — but the synthesised
   *  DECISION_CREATED entry will).                                       */
  auditEntries: AuditEntry[]
}

/** Correlate a decision with its downstream artefacts by decisionId. */
export const buildDrilldown = (
  decision: TradeDecision,
  ctx: {
    vetos: SentinelVeto[]
    orders: PaperOrder[]
    positions: Position[]
    /** Optional. When supplied, entries with `data.decisionId === decision.id`
     *  are surfaced in the modal as the raw event timeline.               */
    entries?: AuditEntry[]
  },
): DecisionDrilldown => {
  const veto = ctx.vetos.find((v) => v.decisionId === decision.id) ?? null
  const orders = ctx.orders.filter((o) => o.decisionId === decision.id)
  const position = ctx.positions.find((p) => p.decisionId === decision.id) ?? null
  const consensus = inspectConsensus(decision)
  const providers = buildProviderViews(decision, consensus)
  const auditEntries = (ctx.entries ?? []).filter((e) => {
    const d = e.data as { decisionId?: unknown } | null | undefined
    return d != null && d.decisionId === decision.id
  })
  return { decision, consensus, providers, veto, orders, position, auditEntries }
}

/**
 * Recovers per-provider detail in two ways:
 *   - Agreed consensus thesis is written as
 *       `[providerId] thesis | [providerId] thesis | ...`
 *     by src/ai/consensus.ts::synthesiseAgreed. We parse that back.
 *   - Split HOLD encodes votes in keyFactors (`${id}:${ACTION}:${conf}`);
 *     ConsensusInfo.votes already carries that, just reshape it.
 *
 * Non-consensus decisions return an empty array.
 */
const buildProviderViews = (
  decision: TradeDecision,
  consensus: ConsensusInfo,
): ProviderView[] => {
  if (!consensus.isConsensus) return []
  // HOLD split: votes live in keyFactors, not in the thesis.
  if (consensus.isSplit) {
    return consensus.votes.map((v) => ({
      providerId: v.providerId,
      thesis: null,
      action: v.action,
      confidence: v.confidence,
    }))
  }
  // Agreed: parse the concatenated thesis.
  const parsed = parseAgreedThesis(decision.thesis)
  if (parsed.length > 0) {
    return parsed.map((p) => ({
      providerId: p.providerId,
      thesis: p.thesis,
      action: decision.action,
      confidence: null, // individual conf is not preserved after averaging
    }))
  }
  return []
}

/**
 * Parses `[providerId] thesis | [providerId] thesis` back into entries.
 * Returns an empty list if the format doesn't match — the caller then
 * falls back to the full raw thesis.
 *
 * Provider ids can contain spaces or colons (e.g. `claude:sonnet-4-5`)
 * but cannot contain `]`, which the synthesiser doesn't emit. Thesis
 * bodies can contain `|` (e.g. hand-written prose), so we split on
 * ` | [` to avoid breaking theses that use `|` internally.
 */
const AGREED_SEGMENT_RE = /^\[([^\]]+)\]\s*(.*)$/
export const parseAgreedThesis = (
  thesis: string,
): Array<{ providerId: string; thesis: string }> => {
  if (!thesis.startsWith('[')) return []
  // Split on the delimiter that introduces the NEXT provider header.
  // Any internal `|` characters inside a thesis body survive untouched.
  const parts = thesis.split(/\s\|\s(?=\[)/)
  const out: Array<{ providerId: string; thesis: string }> = []
  for (const p of parts) {
    const m = AGREED_SEGMENT_RE.exec(p)
    if (!m) return [] // any malformed segment → bail out, caller shows raw
    out.push({ providerId: m[1], thesis: m[2].trim() })
  }
  return out
}
