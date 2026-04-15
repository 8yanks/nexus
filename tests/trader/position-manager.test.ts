import { describe, it, expect } from 'vitest'
import { PositionManager } from '@/trader/position-manager'
import { AuditLogger } from '@/audit/logger'
import type { PaperOrder } from '@/types/order'
import type { TradeDecision } from '@/types/decision'

function decision(over: Partial<TradeDecision> = {}): TradeDecision {
  return {
    id: 'd1',
    timestamp: 1,
    instrumentId: 'BTCUSD',
    symbol: 'BTC/USD',
    action: 'BUY',
    size: 1,
    entryPrice: 100,
    stopLoss: 95,
    takeProfit: 110,
    confidence: 0.8,
    riskLevel: 'medium',
    horizon: 'intraday',
    thesis: 't',
    keyFactors: [],
    invalidators: [],
    requiresHumanReview: false,
    modelSource: 'm',
    consensusScore: null,
    _source: 's',
    _status: 'LIVE',
    _contextHash: 'h',
    ...over,
  }
}

function order(over: Partial<PaperOrder> = {}): PaperOrder {
  return {
    id: 'o1',
    timestamp: 2,
    decisionId: 'd1',
    sentinelApprovalId: 'v1',
    instrumentId: 'BTCUSD',
    symbol: 'BTC/USD',
    side: 'buy',
    type: 'limit',
    size: 1,
    price: 100,
    slippage: 0,
    status: 'filled',
    fillPrice: 100,
    fillTime: 2,
    pnl: 0,
    _source: 'paper_broker',
    _status: 'SIMULATED',
    ...over,
  }
}

describe('PositionManager', () => {
  it('opens a long position from a filled BUY order', () => {
    const pm = new PositionManager()
    const p = pm.open(order(), decision())
    expect(p?.side).toBe('long')
    expect(p?.entryPrice).toBe(100)
    expect(pm.open_().length).toBe(1)
  })

  it('opens a short position from a filled SELL order', () => {
    const pm = new PositionManager()
    const p = pm.open(
      order({ side: 'sell' }),
      decision({ action: 'SELL', stopLoss: 105, takeProfit: 90 }),
    )
    expect(p?.side).toBe('short')
  })

  it('refuses to open from an unfilled order', () => {
    const pm = new PositionManager()
    const p = pm.open(order({ status: 'rejected', fillPrice: null }), decision())
    expect(p).toBeNull()
  })

  it('marks to market and computes unrealized PnL', () => {
    const pm = new PositionManager()
    pm.open(order(), decision())
    pm.mark({ BTCUSD: 105 })
    const p = pm.list()[0]
    expect(p.markPrice).toBe(105)
    expect(p.unrealizedPnl).toBe(5)
    expect(p.unrealizedPnlPct).toBeCloseTo(5)
  })

  it('auto-closes on take-profit for long', () => {
    const pm = new PositionManager()
    pm.open(order(), decision())
    const closed = pm.mark({ BTCUSD: 112 })
    expect(closed).toHaveLength(1)
    expect(closed[0].closeReason).toBe('take_profit')
    expect(closed[0].realizedPnl).toBe(12)
    expect(pm.portfolio().realizedPnl).toBe(12)
  })

  it('auto-closes on stop-loss for long', () => {
    const pm = new PositionManager()
    pm.open(order(), decision())
    const closed = pm.mark({ BTCUSD: 94 })
    expect(closed[0].closeReason).toBe('stop_loss')
    expect(closed[0].realizedPnl).toBe(-6)
  })

  it('auto-closes short on stop-loss when price rises', () => {
    const pm = new PositionManager()
    pm.open(
      order({ side: 'sell' }),
      decision({ action: 'SELL', stopLoss: 105, takeProfit: 90 }),
    )
    const closed = pm.mark({ BTCUSD: 106 })
    expect(closed[0].closeReason).toBe('stop_loss')
    expect(closed[0].realizedPnl).toBe(-6)
  })

  it('manual close records reason and realized PnL', () => {
    const pm = new PositionManager()
    const p = pm.open(order(), decision())!
    const closed = pm.close(p.id, 103)
    expect(closed?.closeReason).toBe('manual')
    expect(closed?.realizedPnl).toBe(3)
  })

  it('portfolio aggregates exposure and unrealized PnL', () => {
    const pm = new PositionManager()
    pm.open(order(), decision())
    pm.open(order({ id: 'o2' }), decision({ id: 'd2' }))
    pm.mark({ BTCUSD: 102 })
    const s = pm.portfolio()
    expect(s.openCount).toBe(2)
    expect(s.unrealizedPnl).toBe(4)
    expect(s.grossExposure).toBe(204)
  })

  it('emits audit events for open and close', () => {
    const audit = new AuditLogger()
    const pm = new PositionManager({ audit })
    pm.open(order(), decision())
    pm.mark({ BTCUSD: 112 })
    expect(audit.list({ eventType: 'POSITION_OPENED' })).toHaveLength(1)
    expect(audit.list({ eventType: 'POSITION_CLOSED' })).toHaveLength(1)
    expect(audit.list({ eventType: 'PNL_UPDATED' })).toHaveLength(1)
  })
})
