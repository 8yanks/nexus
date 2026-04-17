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
  votes: Array<{ providerId: string; action: string }>
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

/** Parses `${providerId}:${ACTION}` entries written by synthesiseHold. */
const parseVotes = (
  keyFactors: string[],
): Array<{ providerId: string; action: string }> => {
  const out: Array<{ providerId: string; action: string }> = []
  for (const k of keyFactors) {
    const i = k.lastIndexOf(':')
    if (i <= 0 || i === k.length - 1) continue
    const providerId = k.slice(0, i)
    const action = k.slice(i + 1)
    if (action !== 'BUY' && action !== 'SELL' && action !== 'HOLD') continue
    out.push({ providerId, action })
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
  const lines = info.votes.map((v) => `${v.providerId} → ${v.action}`)
  return `provider votes:\n${lines.join('\n')}`
}
