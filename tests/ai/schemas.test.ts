import { describe, it, expect } from 'vitest'
import { validateTradeDecision } from '@/ai/schemas'
import type { TradeDecision } from '@/types/decision'

function baseDecision(): TradeDecision {
  return {
    id: 'dec_1',
    timestamp: 1_700_000_000_000,
    instrumentId: 'BTCUSD',
    symbol: 'BTC/USD',
    action: 'BUY',
    size: 0.5,
    entryPrice: 60000,
    stopLoss: 58000,
    takeProfit: 65000,
    confidence: 0.72,
    riskLevel: 'medium',
    horizon: 'intraday',
    thesis: 'breakout',
    keyFactors: ['volume', 'ema_cross'],
    invalidators: ['vol_drop'],
    requiresHumanReview: false,
    modelSource: 'claude-opus',
    consensusScore: null,
    _source: 'ai_orchestrator',
    _status: 'LIVE',
    _contextHash: 'h_1',
  }
}

describe('validateTradeDecision', () => {
  it('accepts a well-formed decision', () => {
    const r = validateTradeDecision(baseDecision())
    expect(r.ok).toBe(true)
  })

  it('rejects non-object', () => {
    const r = validateTradeDecision('nope')
    expect(r.ok).toBe(false)
  })

  it('rejects out-of-range confidence', () => {
    const r = validateTradeDecision({ ...baseDecision(), confidence: 1.5 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.some((e) => e.path === 'confidence')).toBe(true)
  })

  it('rejects invalid action', () => {
    const r = validateTradeDecision({ ...baseDecision(), action: 'LONG' })
    expect(r.ok).toBe(false)
  })

  it('rejects HOLD with non-zero size', () => {
    const r = validateTradeDecision({ ...baseDecision(), action: 'HOLD', size: 1 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.some((e) => e.path === 'size')).toBe(true)
  })

  it('rejects BUY with zero size', () => {
    const r = validateTradeDecision({ ...baseDecision(), size: 0 })
    expect(r.ok).toBe(false)
  })

  it('rejects bad arrays', () => {
    const r = validateTradeDecision({ ...baseDecision(), keyFactors: [1, 2] })
    expect(r.ok).toBe(false)
  })

  it('rejects invalid _status', () => {
    const r = validateTradeDecision({ ...baseDecision(), _status: 'FOO' })
    expect(r.ok).toBe(false)
  })

  it('accepts null prices', () => {
    const r = validateTradeDecision({
      ...baseDecision(),
      entryPrice: null,
      stopLoss: null,
      takeProfit: null,
    })
    expect(r.ok).toBe(true)
  })
})
