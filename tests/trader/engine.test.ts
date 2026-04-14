import { describe, it, expect } from 'vitest'
import { TraderEngine } from '@/trader/engine'
import { AuditLogger } from '@/audit/logger'
import type { TradeDecision, SentinelVeto } from '@/types/decision'

function decision(overrides: Partial<TradeDecision> = {}): TradeDecision {
  return {
    id: 'd1',
    timestamp: 1,
    instrumentId: 'BTCUSD',
    symbol: 'BTC/USD',
    action: 'BUY',
    size: 0.5,
    entryPrice: 60000,
    stopLoss: 58000,
    takeProfit: 65000,
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
    ...overrides,
  }
}

function veto(overrides: Partial<SentinelVeto> = {}): SentinelVeto {
  return {
    id: 'v1',
    timestamp: 2,
    decisionId: 'd1',
    approved: true,
    vetoReasons: [],
    riskMetrics: {
      currentDrawdown: 0,
      maxDrawdownLimit: 5,
      currentExposure: 0,
      maxExposureLimit: 20,
      dataQualityScore: 1,
      minDataQuality: 0.6,
      latencyMs: 0,
      maxLatencyMs: 5000,
      brokerAvailable: true,
    },
    safeMode: false,
    _source: 'sentinel_engine',
    ...overrides,
  }
}

describe('TraderEngine', () => {
  it('fills a paper order for an approved BUY', () => {
    const audit = new AuditLogger()
    const t = new TraderEngine({ audit })
    const r = t.execute(decision(), veto())
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.order.side).toBe('buy')
      expect(r.order.status).toBe('filled')
      expect(r.order.fillPrice).toBeGreaterThan(60000) // slippage up for buy
      expect(r.order.sentinelApprovalId).toBe('v1')
      expect(r.order._status).toBe('SIMULATED')
    }
    expect(audit.list({ eventType: 'ORDER_FILLED' })).toHaveLength(1)
  })

  it('refuses vetoed decisions', () => {
    const t = new TraderEngine()
    const r = t.execute(
      decision(),
      veto({ approved: false, vetoReasons: ['DATA_TOO_OLD'] }),
    )
    expect(r.ok).toBe(false)
  })

  it('refuses mismatched IDs', () => {
    const t = new TraderEngine()
    const r = t.execute(decision(), veto({ decisionId: 'other' }))
    expect(r.ok).toBe(false)
  })

  it('treats HOLD as no-op', () => {
    const t = new TraderEngine()
    const r = t.execute(decision({ action: 'HOLD', size: 0 }), veto())
    expect(r.ok).toBe(false)
  })

  it('falls back to markPrice when entryPrice is null', () => {
    const t = new TraderEngine({ markPrice: () => 100 })
    const r = t.execute(decision({ entryPrice: null }), veto())
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.order.type).toBe('market')
  })

  it('rejects when no price is available', () => {
    const t = new TraderEngine()
    const r = t.execute(decision({ entryPrice: null }), veto())
    expect(r.ok).toBe(false)
  })

  it('applies negative slippage on SELL', () => {
    const t = new TraderEngine({ slippageBps: 0.01 })
    const r = t.execute(decision({ action: 'SELL' }), veto())
    if (r.ok) expect(r.order.fillPrice).toBeLessThan(60000)
  })
})
