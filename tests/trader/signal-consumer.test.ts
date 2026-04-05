import { describe, it, expect, beforeEach } from 'vitest'
import { filterSignal, consumeSignal, clearPipelineEvents, getPipelineEvents } from '../../apps/trader/src/signal-consumer'
import type { TradeSignal } from '../../apps/trader/src/types'

// ─── HELPERS ──────────────────────────────────────────────

const mkSignal = (overrides: Partial<TradeSignal> = {}): TradeSignal => ({
  id: 'sig_test_1',
  instrumentId: 'BTC-USD',
  signalType: 'RSI_OVERSOLD',
  direction: 'bullish',
  strength: 0.8,
  price: 67000,
  timestamp: new Date().toISOString(),
  source: 'analyst',
  ...overrides,
})

// ─── TESTS ────────────────────────────────────────────────

describe('Signal Consumer — filterSignal', () => {
  it('accepts signal that passes all default filters', () => {
    const result = filterSignal(mkSignal())
    expect(result.accepted).toBe(true)
  })

  it('rejects signal with strength below minimum', () => {
    const result = filterSignal(mkSignal({ strength: 0.3 }), { minStrength: 0.7 })
    expect(result.accepted).toBe(false)
    expect(result.reason).toContain('Strength')
  })

  it('rejects signal type not in allowed list', () => {
    const result = filterSignal(mkSignal({ signalType: 'BB_SQUEEZE' }), {
      allowedTypes: ['RSI_OVERSOLD', 'EMA_CROSS_BULL'],
    })
    expect(result.accepted).toBe(false)
    expect(result.reason).toContain('BB_SQUEEZE')
  })

  it('accepts any type when allowedTypes is empty', () => {
    const result = filterSignal(mkSignal({ signalType: 'BB_SQUEEZE' }), { allowedTypes: [] })
    expect(result.accepted).toBe(true)
  })

  it('rejects wrong direction when filter is set', () => {
    const result = filterSignal(mkSignal({ direction: 'bearish' }), { directionFilter: 'bullish' })
    expect(result.accepted).toBe(false)
    expect(result.reason).toContain('Direction')
  })

  it('accepts any direction when filter is null', () => {
    const result = filterSignal(mkSignal({ direction: 'bearish' }), { directionFilter: null })
    expect(result.accepted).toBe(true)
  })

  it('rejects stale signal exceeding maxAgeMs', () => {
    const old = new Date(Date.now() - 120_000).toISOString()
    const result = filterSignal(mkSignal({ timestamp: old }), { maxAgeMs: 60_000 })
    expect(result.accepted).toBe(false)
    expect(result.reason).toContain('age')
  })
})

describe('Signal Consumer — consumeSignal', () => {
  beforeEach(() => {
    clearPipelineEvents()
  })

  it('logs received + filtered events for accepted signal', () => {
    consumeSignal(mkSignal())
    const events = getPipelineEvents()
    expect(events.length).toBeGreaterThanOrEqual(2)
    expect(events[0].stage).toBe('received')
    expect(events[1].stage).toBe('filtered')
  })

  it('logs received + rejected events for rejected signal', () => {
    consumeSignal(mkSignal({ strength: 0.1 }))
    const events = getPipelineEvents()
    expect(events.length).toBeGreaterThanOrEqual(2)
    expect(events[0].stage).toBe('received')
    expect(events[1].stage).toBe('rejected')
  })

  it('clearPipelineEvents resets the log', () => {
    consumeSignal(mkSignal())
    expect(getPipelineEvents().length).toBeGreaterThan(0)
    clearPipelineEvents()
    expect(getPipelineEvents().length).toBe(0)
  })
})
