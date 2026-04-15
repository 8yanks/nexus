import { describe, it, expect } from 'vitest'
import { DecisionChain } from '@/chain'
import { AIOrchestrator, type AIProvider } from '@/ai/orchestrator'
import { SentinelEngine, type SentinelContext } from '@/sentinel/engine'
import { TraderEngine } from '@/trader/engine'
import { PositionManager } from '@/trader/position-manager'
import { AuditLogger } from '@/audit/logger'
import type { TradeDecision } from '@/types/decision'

function decision(over: Partial<TradeDecision> = {}): TradeDecision {
  return {
    id: 'd',
    timestamp: 1,
    instrumentId: 'BTCUSD',
    symbol: 'BTC/USD',
    action: 'BUY',
    size: 0.1,
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
    ...over,
  }
}

function cleanCtx(over: Partial<SentinelContext> = {}): SentinelContext {
  return {
    currentDrawdownPct: 1,
    currentExposurePct: 5,
    positionSizePct: 1,
    dataQualityScore: 0.9,
    dataAgeMs: 1000,
    latencyMs: 200,
    brokerAvailable: true,
    safeMode: false,
    ...over,
  }
}

function provider(resp: unknown): AIProvider {
  return { id: 'mock', propose: async () => resp }
}

function build(
  resp: unknown,
): { chain: DecisionChain; audit: AuditLogger } {
  const audit = new AuditLogger()
  const ai = new AIOrchestrator(provider(resp), { audit })
  const sentinel = new SentinelEngine({ audit })
  const trader = new TraderEngine({ audit })
  return { chain: new DecisionChain({ ai, sentinel, trader, audit }), audit }
}

describe('DecisionChain', () => {
  it('fills a paper order through all stages', async () => {
    const { chain, audit } = build(decision())
    const r = await chain.run('h', {}, cleanCtx())
    expect(r.stage).toBe('filled')
    expect(audit.list({ eventType: 'ORDER_FILLED' })).toHaveLength(1)
  })

  it('stops at ai_rejected when response is invalid', async () => {
    const { chain } = build({ garbage: true })
    const r = await chain.run('h', {}, cleanCtx())
    expect(r.stage).toBe('ai_rejected')
  })

  it('stops at sentinel_vetoed when data is stale', async () => {
    const { chain } = build(decision())
    const r = await chain.run('h', {}, cleanCtx({ dataAgeMs: 99999 }))
    expect(r.stage).toBe('sentinel_vetoed')
    if (r.stage === 'sentinel_vetoed') expect(r.reasons).toContain('DATA_TOO_OLD')
  })

  it('stops at order_rejected for HOLD', async () => {
    const { chain } = build(decision({ action: 'HOLD', size: 0 }))
    const r = await chain.run('h', {}, cleanCtx())
    expect(r.stage).toBe('order_rejected')
  })

  it('returns the Sentinel veto on every post-AI stage', async () => {
    const approved = build(decision())
    const r1 = await approved.chain.run('h', {}, cleanCtx())
    expect(r1.stage).toBe('filled')
    if (r1.stage === 'filled') {
      expect(r1.veto.approved).toBe(true)
      expect(r1.veto.decisionId).toBe(r1.decision.id)
    }

    const blocked = build(decision())
    const r2 = await blocked.chain.run('h', {}, cleanCtx({ dataAgeMs: 99999 }))
    expect(r2.stage).toBe('sentinel_vetoed')
    if (r2.stage === 'sentinel_vetoed') {
      expect(r2.veto.approved).toBe(false)
      expect(r2.veto.vetoReasons).toContain('DATA_TOO_OLD')
    }
  })

  it('wires a filled outcome into the PositionManager', async () => {
    const { chain } = build(decision())
    const pm = new PositionManager()
    const outcome = await chain.run('h', {}, cleanCtx())
    expect(outcome.stage).toBe('filled')
    if (outcome.stage === 'filled') {
      const pos = pm.open(outcome.order, outcome.decision)
      expect(pos).not.toBeNull()
      expect(pm.listOpen()).toHaveLength(1)
      // Mark above take-profit to close the position automatically.
      const closed = pm.mark({ BTCUSD: 70000 })
      expect(closed).toHaveLength(1)
      expect(closed[0].closeReason).toBe('take_profit')
      expect(pm.portfolio().realizedPnl).toBeGreaterThan(0)
    }
  })
})
