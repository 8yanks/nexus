import { describe, it, expect } from 'vitest'
import { AIOrchestrator, type AIProvider } from '@/ai/orchestrator'
import { AuditLogger } from '@/audit/logger'
import type { TradeDecision } from '@/types/decision'

function validDecision(): TradeDecision {
  return {
    id: 'dec_x',
    timestamp: 1_700_000_000_000,
    instrumentId: 'ETHUSD',
    symbol: 'ETH/USD',
    action: 'SELL',
    size: 1,
    entryPrice: 3000,
    stopLoss: 3100,
    takeProfit: 2800,
    confidence: 0.8,
    riskLevel: 'low',
    horizon: 'swing',
    thesis: 't',
    keyFactors: ['a'],
    invalidators: ['b'],
    requiresHumanReview: false,
    modelSource: 'mock',
    consensusScore: 0.9,
    _source: 'ai_orchestrator',
    _status: 'SIMULATED',
    _contextHash: 'h',
  }
}

function provider(resp: unknown | (() => Promise<unknown>)): AIProvider {
  return {
    id: 'mock',
    propose: async () => (typeof resp === 'function' ? await (resp as () => Promise<unknown>)() : resp),
  }
}

describe('AIOrchestrator', () => {
  it('returns validated decision and logs audit trail', async () => {
    const audit = new AuditLogger()
    const orch = new AIOrchestrator(provider(validDecision()), { audit })
    const r = await orch.decide('h', {})
    expect(r.ok).toBe(true)
    const types = audit.list().map((e) => e.eventType)
    expect(types).toContain('AI_PROMPT_SENT')
    expect(types).toContain('AI_RESPONSE_RAW')
    expect(types).toContain('AI_RESPONSE_VALIDATED')
    expect(types).toContain('DECISION_CREATED')
  })

  it('rejects invalid response and logs AI_RESPONSE_REJECTED', async () => {
    const audit = new AuditLogger()
    const orch = new AIOrchestrator(provider({ bad: true }), { audit })
    const r = await orch.decide('h', {})
    expect(r.ok).toBe(false)
    expect(audit.list({ eventType: 'AI_RESPONSE_REJECTED' })).toHaveLength(1)
  })

  it('captures provider errors as SYSTEM_ERROR', async () => {
    const audit = new AuditLogger()
    const orch = new AIOrchestrator(
      provider(() => {
        throw new Error('boom')
      }),
      { audit },
    )
    const r = await orch.decide('h', {})
    expect(r.ok).toBe(false)
    expect(audit.list({ eventType: 'SYSTEM_ERROR' })).toHaveLength(1)
  })
})
