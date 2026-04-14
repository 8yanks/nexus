import { describe, it, expect } from 'vitest'
import { ruleBasedProvider } from '@/ai/providers/rule-based'
import { validateTradeDecision } from '@/ai/schemas'
import type { AnalystContext } from '@/analyst/context-builder'
import type { SignalEvent } from '@/types/signal'

const sig = (
  direction: SignalEvent['direction'],
  strength: number,
  id = Math.random().toString(36),
): SignalEvent => ({
  id,
  instrumentId: 'BTCUSD',
  type: 'RSI_OVERSOLD',
  direction,
  strength,
  description: 'd',
  price: 60000,
  timestamp: '2026-04-14T12:00:00Z',
  _source: 'analyst',
  _status: 'LIVE',
})

const ctx = (signals: SignalEvent[]): AnalystContext => ({
  instrumentId: 'BTCUSD',
  symbol: 'BTC/USD',
  price: 60000,
  snapshot: {} as never,
  signals,
  quality: null,
  contextHash: 'h',
  builtAt: 0,
})

describe('ruleBasedProvider', () => {
  it('emits BUY when bullish dominates', async () => {
    const p = ruleBasedProvider(() =>
      ctx([sig('bullish', 0.8, 'a'), sig('bullish', 0.5, 'b')]),
    )
    const raw = await p.propose('h', {})
    const r = validateTradeDecision(raw)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.action).toBe('BUY')
      expect(r.value.stopLoss).toBeLessThan(60000)
      expect(r.value.takeProfit).toBeGreaterThan(60000)
    }
  })

  it('emits SELL when bearish dominates', async () => {
    const p = ruleBasedProvider(() =>
      ctx([sig('bearish', 0.9, 'a'), sig('bearish', 0.6, 'b')]),
    )
    const raw = await p.propose('h', {})
    const r = validateTradeDecision(raw)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.action).toBe('SELL')
  })

  it('emits HOLD when signals cancel out', async () => {
    const p = ruleBasedProvider(() =>
      ctx([sig('bullish', 0.6, 'a'), sig('bearish', 0.6, 'b')]),
    )
    const raw = await p.propose('h', {})
    const r = validateTradeDecision(raw)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.action).toBe('HOLD')
      expect(r.value.size).toBe(0)
    }
  })

  it('always produces schema-valid output', async () => {
    const p = ruleBasedProvider(() => ctx([]))
    const raw = await p.propose('h', {})
    expect(validateTradeDecision(raw).ok).toBe(true)
  })
})
