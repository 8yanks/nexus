// ─── CONSENSUS DISPLAY HELPERS ──────────────────────────────
// Pure functions for surfacing consensus signal in the UI. Kept out of the
// React component so they're trivially unit-testable.

import type { TradeDecision } from '@/types/decision'

export interface ConsensusInfo {
  /** Decision came out of the multi-provider consensus orchestrator. */
  isConsensus: boolean
  /** Vote share on the winning action (0..1) or null when not applicable. */
  share: number | null
  /** True when providers split below the agreement threshold (HOLD path). */
  isSplit: boolean
  /** Per-provider votes if recoverable from the synthesised HOLD payload. */
  votes: Array<{ providerId: string; action: string; confidence: number | null }>
}

/**
 * Inspects a TradeDecision and tells the UI whether it's a consensus output
 * worth annotating. Three cases:
 *   - Not a consensus decision      → isConsensus=false (no badge).
 *   - Consensus, share === 1        → unanimous, badge optional.
 *   - Consensus, share < 1 & HOLD   → split; expose the per-provider votes.
 */
export const inspectConsensus = (d: TradeDecision): ConsensusInfo => {
  const isConsensus = d._source === 'ai_consensus'
  if (!isConsensus) {
    return { isConsensus: false, share: null, isSplit: false, votes: [] }
  }
  const share =
    typeof d.consensusScore === 'number' ? d.consensusScore : null
  const isSplit = share !== null && share < 1 && d.action === 'HOLD'
  const votes = isSplit ? parseVotes(d.keyFactors) : []
  return { isConsensus, share, isSplit, votes }
}

/**
 * Parses entries written by synthesiseHold. Accepts two shapes:
 *   - `${providerId}:${ACTION}:${confidence}` (current)
 *   - `${providerId}:${ACTION}`               (legacy, confidence=null)
 * Provider ids may themselves contain colons (e.g. `claude:sonnet`), so the
 * last one or two segments are peeled off and the rest is the id.
 */
const ACTIONS = new Set(['BUY', 'SELL', 'HOLD'])
const parseVotes = (
  keyFactors: string[],
): Array<{ providerId: string; action: string; confidence: number | null }> => {
  const out: Array<{
    providerId: string
    action: string
    confidence: number | null
  }> = []
  for (const k of keyFactors) {
    const segments = k.split(':')
    if (segments.length < 2) continue

    // Try 3-segment shape first: [..., ACTION, confidence].
    const last = segments[segments.length - 1]
    const conf = Number(last)
    const confLooksValid =
      !Number.isNaN(conf) && conf >= 0 && conf <= 1 && last.length > 0

    if (confLooksValid && segments.length >= 3) {
      const action = segments[segments.length - 2]
      const providerId = segments.slice(0, -2).join(':')
      if (providerId && ACTIONS.has(action)) {
        out.push({ providerId, action, confidence: conf })
        continue
      }
    }

    // Fall back to 2-segment legacy shape: [..., ACTION].
    const action = segments[segments.length - 1]
    const providerId = segments.slice(0, -1).join(':')
    if (providerId && ACTIONS.has(action)) {
      out.push({ providerId, action, confidence: null })
    }
  }
  return out
}

/** Short label for a consensus badge, e.g. "split 50%" or "unanimous". */
export const consensusLabel = (info: ConsensusInfo): string | null => {
  if (!info.isConsensus || info.share === null) return null
  if (info.isSplit) return `split ${Math.round(info.share * 100)}%`
  if (info.share >= 1) return 'unanimous'
  return `share ${Math.round(info.share * 100)}%`
}

/** Tooltip text listing per-provider votes; null when nothing useful to show. */
export const consensusTooltip = (info: ConsensusInfo): string | null => {
  if (!info.isConsensus) return null
  if (info.votes.length === 0) {
    if (info.share !== null) {
      return `consensus share ${(info.share * 100).toFixed(0)}%`
    }
    return null
  }
  const lines = info.votes.map((v) => {
    const suffix = v.confidence === null ? '' : ` (conf ${v.confidence.toFixed(2)})`
    return `${v.providerId} → ${v.action}${suffix}`
  })
  return `provider votes:\n${lines.join('\n')}`
}
