import { describe, it, expect, beforeEach } from 'vitest'
import { executeSignal, clearPipelineLog, getPipelineLog, setDrawdown } from '../../apps/trader/src/pipeline'
import { configureFreqtrade } from '../../apps/trader/src/freqtrade-bridge'
import { clearPipelineEvents } from '../../apps/trader/src/signal-consumer'
import { markHealthy, markDown } from '@nexus/shared-infra'
import type { TradeSignal } from '../../apps/trader/src/types'

// ─── HELPERS ──────────────────────────────────────────────

const mkSignal = (overrides: Partial<TradeSignal> = {}): TradeSignal => ({
  id: 'sig_pipe_1',
  instrumentId: 'ETH-USD',
  signalType: 'EMA_CROSS_BULL',
  direction: 'bullish',
  strength: 0.9,
  price: 2050,
  timestamp: new Date().toISOString(),
  source: 'analyst',
  ...overrides,
})

// ─── TESTS ────────────────────────────────────────────────

describe('Trade Pipeline', () => {
  beforeEach(() => {
    clearPipelineLog()
    clearPipelineEvents()
    setDrawdown(0)
    configureFreqtrade({ dryRun: true })
    // Ensure health is good for most tests
    markHealthy('test_provider', 5)
  })

  it('rejects signal that fails filter', async () => {
    const result = await executeSignal(mkSignal({ strength: 0.1 }))
    expect(result.order).toBeNull()
    expect(result.events.some((e) => e.stage === 'rejected')).toBe(true)
  })

  it('rejects signal when Sentinel vetoes (system down)', async () => {
    markDown('critical_system', 'test failure')
    const result = await executeSignal(mkSignal())
    expect(result.order).toBeNull()
    expect(result.events.some((e) => e.stage === 'vetoed')).toBe(true)
  })

  it('rejects signal when drawdown exceeds limit', async () => {
    setDrawdown(8.0) // above default 5%
    const result = await executeSignal(mkSignal())
    expect(result.order).toBeNull()
    expect(result.events.some((e) => e.stage === 'vetoed')).toBe(true)
  })

  it('submits order when all checks pass (dry-run)', async () => {
    setDrawdown(1.0)
    // Clear any leftover 'down' components from prior tests
    markHealthy('critical_system', 0)
    markHealthy('all_systems', 2)
    const result = await executeSignal(mkSignal())
    // Should reach submission stage (order may be rejected by stub)
    expect(result.events.some((e) => e.stage === 'approved' || e.stage === 'submitted')).toBe(true)
  })

  it('logs all pipeline stages', async () => {
    const result = await executeSignal(mkSignal())
    expect(result.events.length).toBeGreaterThanOrEqual(2)
    // Pipeline log also accumulates
    expect(getPipelineLog().length).toBeGreaterThan(0)
  })

  it('clearPipelineLog resets the log', async () => {
    await executeSignal(mkSignal())
    expect(getPipelineLog().length).toBeGreaterThan(0)
    clearPipelineLog()
    expect(getPipelineLog().length).toBe(0)
  })
})
