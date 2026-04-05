// ─── TRADE PIPELINE ─────────────────────────────────────────
// Full signal-to-execution pipeline:
//   1. Receive signal from Analyst
//   2. Filter (signal-consumer)
//   3. Veto check (Sentinel)
//   4. Submit order (Freqtrade bridge)
//
// Each step is logged and traceable.

import { evaluateVeto } from '@nexus/sentinel'
import { getSystemHealth } from '@nexus/shared-infra'
import { consumeSignal } from './signal-consumer'
import { submitOrder, isDryRun, getOpenTrades } from './freqtrade-bridge'
import type { TradeSignal, Order, PipelineEvent } from './types'
import type { SignalFilterConfig } from './signal-consumer'

// ─── PIPELINE CONFIG ───────────────────────────────────────

export interface PipelineConfig {
  filterConfig: Partial<SignalFilterConfig>
  maxDrawdownPct: number
  dryRun: boolean
}

const DEFAULT_PIPELINE: PipelineConfig = {
  filterConfig: {},
  maxDrawdownPct: 5,
  dryRun: true,
}

// ─── STATE ─────────────────────────────────────────────────

const pipelineLog: PipelineEvent[] = []
const MAX_LOG = 1000
let currentDrawdownPct = 0

const log = (signalId: string, stage: PipelineEvent['stage'], detail: string): void => {
  pipelineLog.push({ timestamp: new Date().toISOString(), signalId, stage, detail })
  if (pipelineLog.length > MAX_LOG) pipelineLog.splice(0, pipelineLog.length - MAX_LOG)
}

// ─── PIPELINE ──────────────────────────────────────────────

export const executeSignal = async (
  signal: TradeSignal,
  overrides: Partial<PipelineConfig> = {},
): Promise<{ order: Order | null; events: PipelineEvent[] }> => {
  const config = { ...DEFAULT_PIPELINE, ...overrides }
  const signalEvents: PipelineEvent[] = []
  const track = (stage: PipelineEvent['stage'], detail: string) => {
    log(signal.id, stage, detail)
    signalEvents.push({ timestamp: new Date().toISOString(), signalId: signal.id, stage, detail })
  }

  // Step 1: Filter
  const filterResult = consumeSignal(signal, config.filterConfig)
  if (!filterResult.accepted) {
    track('rejected', `Filter: ${filterResult.reason}`)
    return { order: null, events: signalEvents }
  }
  track('filtered', 'Passed signal filters')

  // Step 2: Sentinel veto
  const health = getSystemHealth()
  const openTrades = await getOpenTrades()
  const vetoResult = evaluateVeto(health, currentDrawdownPct, openTrades.length)

  if (!vetoResult.allowed) {
    track('vetoed', vetoResult.reason ?? 'Sentinel veto')
    return { order: null, events: signalEvents }
  }
  track('approved', `Sentinel approved — ${vetoResult.checks.length} checks passed`)

  // Step 3: Safety check
  if (!isDryRun() && !config.dryRun) {
    track('rejected', 'SAFETY: Live trading not enabled in pipeline config')
    return { order: null, events: signalEvents }
  }

  // Step 4: Submit order
  const side = signal.direction === 'bullish' ? 'buy' as const : 'sell' as const
  try {
    const order = await submitOrder(signal.instrumentId, side, signal.id)
    track('submitted', `Order ${order.id} submitted (${order.side} ${order.instrumentId})`)

    if (order.status === 'filled' || order.status === 'partial') {
      track('executed', `Order ${order.id} ${order.status} at ${order.filledPrice ?? 'market'}`)
    }

    return { order, events: signalEvents }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    track('rejected', `Order failed: ${msg}`)
    return { order: null, events: signalEvents }
  }
}

// ─── STATE API ─────────────────────────────────────────────

export const setDrawdown = (pct: number): void => { currentDrawdownPct = pct }
export const getDrawdown = (): number => currentDrawdownPct
export const getPipelineLog = (): PipelineEvent[] => [...pipelineLog]
export const clearPipelineLog = (): void => { pipelineLog.length = 0 }
