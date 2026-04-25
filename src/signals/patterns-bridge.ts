import type { SignalEvent, SignalType, DataStatus } from '@/types'
import type { DetectedPattern, PatternType } from '@/analytics/patterns'
import { SIGNAL_THRESHOLDS } from '@/signals/types'

// ─── PATTERNS → SIGNALS ────────────────────────────────────
//
// Bridges detected chart patterns into the SignalEvent stream so
// they flow through the same downstream pipeline (journal, alert
// engine, AI orchestrator inputs) as RSI/BB/EMA signals.
//
// The pattern detector itself keeps anything ≥ 0.3 confidence; here
// we apply a higher floor (`PATTERN_MIN_CONFIDENCE`, default 0.6) to
// avoid surfacing noisy detections as actionable. Strength is taken
// directly from the pattern's confidence — a high-conviction pattern
// reads as a stronger signal than a marginal one.
//
// Mirror of `corporateToSignals` / `macroToSignals` so the store's
// signal aggregation stays uniform.

let _seqId = 0
const genId = (): string => `sig_pattern_${Date.now()}_${++_seqId}`

const PATTERN_TYPE_MAP: Record<PatternType, SignalType> = {
  DOUBLE_TOP:                 'PATTERN_DOUBLE_TOP',
  DOUBLE_BOTTOM:              'PATTERN_DOUBLE_BOTTOM',
  HEAD_AND_SHOULDERS:         'PATTERN_HEAD_SHOULDERS',
  INVERSE_HEAD_AND_SHOULDERS: 'PATTERN_INV_HEAD_SHOULDERS',
  ASCENDING_TRIANGLE:         'PATTERN_ASCENDING_TRIANGLE',
  DESCENDING_TRIANGLE:        'PATTERN_DESCENDING_TRIANGLE',
}

export const patternsToSignals = (
  instrumentId: string,
  patterns: DetectedPattern[],
  price: number,
): SignalEvent[] =>
  patterns
    .filter((p) => p.confidence >= SIGNAL_THRESHOLDS.PATTERN_MIN_CONFIDENCE)
    .map((p) => ({
      id: genId(),
      instrumentId,
      type: PATTERN_TYPE_MAP[p.type],
      direction: p.direction, // 'bullish' | 'bearish' — already narrowed
      strength: p.confidence, // pass through — caller already gated
      // Embed the neckline so a downstream UI can show "DOUBLE TOP @ $67500"
      // without needing a second lookup.
      description: `[Pattern] ${p.description} — neckline ${p.neckline}`,
      price,
      timestamp: new Date().toISOString(),
      _source: 'patterns_bridge',
      _status: 'SIMULATED' as DataStatus,
    }))
