// ─── SIGNAL CONSUMER ────────────────────────────────────────
// Receives signals from the Analyst bot, filters them by
// configured criteria, and forwards qualifying signals
// to the execution pipeline.

import type { SignalType, SignalDirection } from '@/types'
import type { TradeSignal, PipelineEvent } from './types'

// ─── FILTER CONFIG ─────────────────────────────────────────

export interface SignalFilterConfig {
  /** Only accept these signal types (empty = accept all) */
  allowedTypes: SignalType[]
  /** Minimum signal strength to consider (0–1) */
  minStrength: number
  /** Only accept signals with this direction (null = any) */
  directionFilter: SignalDirection | null
  /** Ignore signals older than this (ms) */
  maxAgeMs: number
}

const DEFAULT_FILTER: SignalFilterConfig = {
  allowedTypes: [],
  minStrength: 0.7,
  directionFilter: null,
  maxAgeMs: 60_000, // 1 minute
}

// ─── STATE ─────────────────────────────────────────────────

const events: PipelineEvent[] = []
const MAX_EVENTS = 500

const addEvent = (signalId: string, stage: PipelineEvent['stage'], detail: string): void => {
  events.push({ timestamp: new Date().toISOString(), signalId, stage, detail })
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS)
}

// ─── FILTER LOGIC ──────────────────────────────────────────

export const filterSignal = (
  signal: TradeSignal,
  config: Partial<SignalFilterConfig> = {},
): { accepted: boolean; reason: string } => {
  const cfg = { ...DEFAULT_FILTER, ...config }

  // Check type whitelist
  if (cfg.allowedTypes.length > 0 && !cfg.allowedTypes.includes(signal.signalType)) {
    return { accepted: false, reason: `Signal type ${signal.signalType} not in allowed list` }
  }

  // Check strength
  if (signal.strength < cfg.minStrength) {
    return { accepted: false, reason: `Strength ${signal.strength.toFixed(2)} below minimum ${cfg.minStrength}` }
  }

  // Check direction
  if (cfg.directionFilter && signal.direction !== cfg.directionFilter) {
    return { accepted: false, reason: `Direction ${signal.direction} does not match filter ${cfg.directionFilter}` }
  }

  // Check age
  const ageMs = Date.now() - new Date(signal.timestamp).getTime()
  if (ageMs > cfg.maxAgeMs) {
    return { accepted: false, reason: `Signal age ${ageMs}ms exceeds max ${cfg.maxAgeMs}ms` }
  }

  return { accepted: true, reason: 'All filters passed' }
}

// ─── CONSUMER ──────────────────────────────────────────────

export const consumeSignal = (
  signal: TradeSignal,
  filterConfig: Partial<SignalFilterConfig> = {},
): { accepted: boolean; reason: string } => {
  addEvent(signal.id, 'received', `${signal.signalType} on ${signal.instrumentId}`)

  const result = filterSignal(signal, filterConfig)

  if (result.accepted) {
    addEvent(signal.id, 'filtered', 'Passed all filters — forwarding to veto')
  } else {
    addEvent(signal.id, 'rejected', result.reason)
  }

  return result
}

// ─── READ ──────────────────────────────────────────────────

export const getPipelineEvents = (): PipelineEvent[] => [...events]
export const clearPipelineEvents = (): void => { events.length = 0 }
