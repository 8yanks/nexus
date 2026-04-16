import { describe, it, expect } from 'vitest'
import { ConsensusOrchestrator } from '@/ai/consensus'
import type { AIProvider } from '@/ai/orchestrator'
import { AuditLogger } from '@/audit/logger'
import type { TradeDecision, DecisionAction } from '@/types/decision'

let seq = 0
const baseDecision = (over: Partial<TradeDecision> = {}): TradeDecision => ({
  id: `dec_${(seq++).toString(36)}`,
  timestamp: 1_700_000_000_000,
  instrumentId: 'BTCUSD',
  symbol: 'BTC/USD',
  action: 'BUY',
  size: 0.1,
  entryPrice: 60_000,
  stopLoss: 58_000,
  takeProfit: 65_000,
  confidence: 0.7,
  riskLevel: 'medium',
  horizon: 'intraday',
  thesis: 't',
  keyFactors: ['ema'],
  invalidators: ['stop'],
  requiresHumanReview: false,
  modelSource: 'mock',
  consensusScore: null,
  _source: 'ai_orchestrator',
  _status: 'LIVE',
  _contextHash: 'h',
  ...over,
})

const provider = (
  id: string,
  resp: unknown | (() => Promise<unknown> | unknown),
): AIProvider => ({
  id,
  propose: async () =>
    typeof resp === 'function' ? await (resp as () => Promise<unknown>)() : resp,
})

describe('ConsensusOrchestrator', () => {
  it('throws when constructed with zero providers', () => {
    expect(
      () =>
        new ConsensusOrchestrator({
          providers: [],
        }),
    ).toThrow(/at least one provider/i)
  })

  it('passes through a single provider and stamps consensusScore', async () => {
    const dec = baseDecision({ confidence: 0.84, action: 'BUY' })
    const orch = new ConsensusOrchestrator({
      providers: [provider('p1', dec)],
      id: 'consensus[p1]',
    })
    const r = await orch.decide('h', {})
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.decision.action).toBe('BUY')
    expect(r.decision.consensusScore).toBe(0.84)
    expect(r.decision.modelSource).toBe('consensus[p1]')
  })

  it('synthesises an agreed decision when all providers vote the same action', async () => {
    const a = baseDecision({
      id: 'a',
      action: 'BUY',
      confidence: 0.6,
      size: 0.1,
      entryPrice: 60_000,
      stopLoss: 58_000,
      takeProfit: 65_000,
      keyFactors: ['ema'],
      invalidators: ['stop'],
    })
    const b = baseDecision({
      id: 'b',
      action: 'BUY',
      confidence: 0.8,
      size: 0.2,
      entryPrice: 60_400,
      stopLoss: 58_400,
      takeProfit: 65_400,
      keyFactors: ['rsi', 'ema'],
      invalidators: ['stop', 'volume'],
    })
    const c = baseDecision({
      id: 'c',
      action: 'BUY',
      confidence: 0.7,
      size: 0.3,
      entryPrice: 60_200,
      stopLoss: 58_200,
      takeProfit: 65_200,
      keyFactors: ['macd'],
      invalidators: ['drawdown'],
    })
    const orch = new ConsensusOrchestrator({
      providers: [provider('p1', a), provider('p2', b), provider('p3', c)],
      id: 'consensus[p1+p2+p3]',
    })
    const r = await orch.decide('h', {})
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.decision.action).toBe('BUY')
    // mean confidence = 0.7
    expect(r.decision.confidence).toBeCloseTo(0.7, 5)
    // mean size = 0.2
    expect(r.decision.size).toBeCloseTo(0.2, 5)
    // median entryPrice across [60_000, 60_400, 60_200] sorted is 60_200
    expect(r.decision.entryPrice).toBe(60_200)
    expect(r.decision.stopLoss).toBe(58_200)
    expect(r.decision.takeProfit).toBe(65_200)
    expect(r.decision.consensusScore).toBe(1)
    // Unanimity AND meanConf >= 0.6 → no human review
    expect(r.decision.requiresHumanReview).toBe(false)
    expect(r.decision.modelSource).toBe('consensus[p1+p2+p3]')
    // dedupe across keyFactors
    expect(r.decision.keyFactors).toEqual(
      expect.arrayContaining(['ema', 'rsi', 'macd']),
    )
    expect(new Set(r.decision.keyFactors).size).toBe(r.decision.keyFactors.length)
    expect(r.decision._source).toBe('ai_consensus')
  })

  it('flags requiresHumanReview when mean confidence is below 0.6 even on unanimity', async () => {
    const a = baseDecision({ action: 'SELL', confidence: 0.4 })
    const b = baseDecision({ action: 'SELL', confidence: 0.5 })
    const orch = new ConsensusOrchestrator({
      providers: [provider('p1', a), provider('p2', b)],
    })
    const r = await orch.decide('h', {})
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.decision.action).toBe('SELL')
    expect(r.decision.requiresHumanReview).toBe(true)
  })

  it('emits a synthesised HOLD when providers split below the threshold', async () => {
    // 2 BUY, 2 SELL → split 0.5; default minAgreement is 0.5 so winner has share === minAgreement.
    // Bump minAgreement to 0.6 to force the HOLD branch.
    const orch = new ConsensusOrchestrator({
      providers: [
        provider('p1', baseDecision({ action: 'BUY', confidence: 0.7 })),
        provider('p2', baseDecision({ action: 'SELL', confidence: 0.7 })),
        provider('p3', baseDecision({ action: 'BUY', confidence: 0.7 })),
        provider('p4', baseDecision({ action: 'SELL', confidence: 0.7 })),
      ],
      minAgreement: 0.6,
    })
    const r = await orch.decide('h', {})
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.decision.action).toBe('HOLD')
    expect(r.decision.size).toBe(0)
    expect(r.decision.entryPrice).toBeNull()
    expect(r.decision.requiresHumanReview).toBe(true)
    // confidence = min(0.4, share*0.5) with share=0.5 → 0.25
    expect(r.decision.confidence).toBeCloseTo(0.25, 5)
    expect(r.decision.consensusScore).toBe(0.5)
    expect(r.decision.keyFactors).toEqual([
      'p1:BUY',
      'p2:SELL',
      'p3:BUY',
      'p4:SELL',
    ])
    expect(r.decision._source).toBe('ai_consensus')
  })

  it('returns ok:false with errors when all providers fail or are invalid', async () => {
    const audit = new AuditLogger()
    const orch = new ConsensusOrchestrator({
      providers: [
        provider('thrower', () => {
          throw new Error('boom')
        }),
        provider('garbage', { not: 'a decision' }),
      ],
      audit,
    })
    const r = await orch.decide('h', {})
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.errors.length).toBeGreaterThan(0)
    expect(r.errors.some((e) => e.path === 'thrower')).toBe(true)
    expect(audit.list({ eventType: 'SYSTEM_ERROR' })).toHaveLength(1)
    expect(audit.list({ eventType: 'AI_RESPONSE_REJECTED' })).toHaveLength(1)
  })

  it('tolerates a partial provider failure and votes with the survivors', async () => {
    const audit = new AuditLogger()
    const orch = new ConsensusOrchestrator({
      providers: [
        provider('p1', baseDecision({ action: 'BUY', confidence: 0.7 })),
        provider('p2', baseDecision({ action: 'BUY', confidence: 0.8 })),
        provider('flaky', () => {
          throw new Error('timeout')
        }),
      ],
      audit,
    })
    const r = await orch.decide('h', {})
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.decision.action).toBe('BUY')
    // 2 of 2 surviving votes agree → share = 1
    expect(r.decision.consensusScore).toBe(1)
    expect(audit.list({ eventType: 'SYSTEM_ERROR' })).toHaveLength(1)
    expect(audit.list({ eventType: 'AI_RESPONSE_VALIDATED' })).toHaveLength(2)
  })

  it('falls through to HOLD when the winning action would be HOLD', async () => {
    // 2 HOLD, 1 BUY: winner is HOLD by tally, but synthesiseAgreed only fires
    // for non-HOLD winners; so we expect the synthesised HOLD path.
    // HOLD votes must carry size=0 to satisfy the schema.
    const orch = new ConsensusOrchestrator({
      providers: [
        provider('p1', baseDecision({ action: 'HOLD', confidence: 0.5, size: 0 })),
        provider('p2', baseDecision({ action: 'HOLD', confidence: 0.5, size: 0 })),
        provider('p3', baseDecision({ action: 'BUY', confidence: 0.9 })),
      ],
      minAgreement: 0.5,
    })
    const r = await orch.decide('h', {})
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.decision.action).toBe('HOLD')
    // share for HOLD = 2/3
    expect(r.decision.consensusScore).toBeCloseTo(2 / 3, 5)
    expect(r.decision._source).toBe('ai_consensus')
  })

  it('logs an AI_PROMPT_SENT and one DECISION_CREATED per call', async () => {
    const audit = new AuditLogger()
    const orch = new ConsensusOrchestrator({
      providers: [
        provider('p1', baseDecision({ action: 'BUY', confidence: 0.7 })),
        provider('p2', baseDecision({ action: 'BUY', confidence: 0.7 })),
      ],
      audit,
    })
    const r = await orch.decide('h', {})
    expect(r.ok).toBe(true)
    expect(audit.list({ eventType: 'AI_PROMPT_SENT' })).toHaveLength(1)
    expect(audit.list({ eventType: 'DECISION_CREATED' })).toHaveLength(1)
  })

  it('uses the supplied idGen for synthesised decision ids', async () => {
    let n = 0
    const orch = new ConsensusOrchestrator({
      providers: [
        provider('p1', baseDecision({ action: 'BUY' })),
        provider('p2', baseDecision({ action: 'BUY' })),
      ],
      idGen: () => `fixed_${n++}`,
    })
    const r = await orch.decide('h', {})
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.decision.id).toBe('fixed_0')
  })

  it('synthesised HOLD survives when median price fields are all null', async () => {
    const a = baseDecision({
      action: 'HOLD',
      size: 0,
      entryPrice: null,
      stopLoss: null,
      takeProfit: null,
    })
    const b = baseDecision({
      action: 'HOLD',
      size: 0,
      entryPrice: null,
      stopLoss: null,
      takeProfit: null,
    })
    const orch = new ConsensusOrchestrator({
      providers: [provider('p1', a), provider('p2', b)],
    })
    const r = await orch.decide('h', {})
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.decision.action).toBe('HOLD')
    expect(r.decision.entryPrice).toBeNull()
    expect(r.decision.stopLoss).toBeNull()
    expect(r.decision.takeProfit).toBeNull()
  })

  // Type sanity: ensure DecisionAction is the right shape under the test fixtures.
  it('handles a SELL majority correctly', async () => {
    const win: DecisionAction = 'SELL'
    const orch = new ConsensusOrchestrator({
      providers: [
        provider('p1', baseDecision({ action: win, confidence: 0.7 })),
        provider('p2', baseDecision({ action: win, confidence: 0.8 })),
        provider('p3', baseDecision({ action: 'BUY', confidence: 0.6 })),
      ],
      minAgreement: 0.6,
    })
    const r = await orch.decide('h', {})
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.decision.action).toBe('SELL')
    expect(r.decision.consensusScore).toBeCloseTo(2 / 3, 5)
  })
})
