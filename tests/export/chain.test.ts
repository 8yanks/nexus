import { describe, it, expect } from 'vitest'
import {
  decisionsToCSV,
  vetosToCSV,
  ordersToCSV,
  positionsToCSV,
  auditToCSV,
  buildChainPayload,
} from '@/export/chain'
import type { TradeDecision, SentinelVeto } from '@/types/decision'
import type { PaperOrder } from '@/types/order'
import type { Position } from '@/types/position'
import type { AuditEntry } from '@/types/audit'

const decision: TradeDecision = {
  id: 'd1',
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
  thesis: 'breakout, with "quotes" and , commas',
  keyFactors: ['rsi'],
  invalidators: ['vol drop'],
  requiresHumanReview: false,
  modelSource: 'rule-based',
  consensusScore: null,
  _source: 'ai_orchestrator',
  _status: 'LIVE',
  _contextHash: 'h1',
}

const veto: SentinelVeto = {
  id: 'v1',
  timestamp: 1_700_000_000_000,
  decisionId: 'd1',
  approved: false,
  vetoReasons: ['DATA_QUALITY_LOW', 'LATENCY_TOO_HIGH'],
  riskMetrics: {
    currentDrawdown: 1.2,
    maxDrawdownLimit: 5,
    currentExposure: 30,
    maxExposureLimit: 60,
    dataQualityScore: 0.4,
    minDataQuality: 0.7,
    latencyMs: 600,
    maxLatencyMs: 500,
    brokerAvailable: true,
  },
  safeMode: false,
  _source: 'sentinel_engine',
}

const order: PaperOrder = {
  id: 'o1',
  timestamp: 1_700_000_000_000,
  decisionId: 'd1',
  sentinelApprovalId: 'v1',
  instrumentId: 'BTCUSD',
  symbol: 'BTC/USD',
  side: 'buy',
  type: 'limit',
  size: 0.1,
  price: 60_000,
  slippage: 0.0005,
  fillPrice: 60_030,
  fillTime: 1_700_000_000_010,
  pnl: 0,
  status: 'filled',
  _source: 'paper_broker',
  _status: 'SIMULATED',
}

const position: Position = {
  id: 'p1',
  orderId: 'o1',
  decisionId: 'd1',
  instrumentId: 'BTCUSD',
  symbol: 'BTC/USD',
  side: 'long',
  size: 0.1,
  entryPrice: 60_030,
  stopLoss: 58_000,
  takeProfit: 65_000,
  openedAt: 1_700_000_000_000,
  closedAt: null,
  markPrice: 60_500,
  unrealizedPnl: 47,
  unrealizedPnlPct: 0.78,
  realizedPnl: null,
  closeReason: null,
  status: 'open',
  _source: 'paper_broker',
  _status: 'SIMULATED',
}

const audit: AuditEntry = {
  id: 'a1',
  timestamp: 1_700_000_000_000,
  eventType: 'DECISION_CREATED',
  module: 'ai',
  summary: 'BUY 0.1 BTCUSD',
  data: {},
  _source: 'orchestrator',
}

describe('chain export — CSV', () => {
  it('produces a header + one row for each decision', () => {
    const csv = decisionsToCSV([decision])
    const [header, body] = csv.split('\n')
    expect(header).toContain('action')
    expect(header).toContain('context_hash')
    expect(body).toContain('BUY')
    expect(body).toContain('BTC/USD')
  })

  it('escapes quotes and commas in thesis', () => {
    const csv = decisionsToCSV([decision])
    expect(csv).toContain('"breakout, with ""quotes"" and , commas"')
  })

  it('serialises veto reasons as pipe-separated string', () => {
    const csv = vetosToCSV([veto])
    expect(csv).toContain('DATA_QUALITY_LOW|LATENCY_TOO_HIGH')
  })

  it('emits empty cells for null fill prices', () => {
    const o: PaperOrder = {
      ...order,
      fillPrice: null,
      fillTime: null,
      pnl: null,
      status: 'rejected',
    }
    const csv = ordersToCSV([o])
    // header order: ..., price, slippage, fill_price, fill_iso, pnl, status
    // expect three consecutive empty cells before the status cell.
    expect(csv).toMatch(/,,,,rejected$/)
  })

  it('keeps closed_iso empty for an open position', () => {
    const csv = positionsToCSV([position])
    const [, body] = csv.split('\n')
    const cells = body.split(',')
    // header order: id, opened_iso, closed_iso, ...
    expect(cells[2]).toBe('')
    expect(body).toContain('long')
  })

  it('audit CSV is one header + one row per entry', () => {
    const csv = auditToCSV([audit, { ...audit, id: 'a2' }])
    expect(csv.split('\n')).toHaveLength(3)
    expect(csv).toContain('DECISION_CREATED')
  })
})

describe('chain export — JSON', () => {
  it('builds a stable payload with counts', () => {
    const payload = buildChainPayload([decision], [veto], [order], [position], [audit])
    expect(payload.counts).toEqual({
      decisions: 1,
      vetos: 1,
      orders: 1,
      positions: 1,
      audit: 1,
    })
    expect(payload._meta.source).toBe('nexus_decision_chain')
    expect(payload.decisions[0]?.id).toBe('d1')
    expect(typeof payload.exportedAt).toBe('string')
  })

  it('round-trips through JSON.stringify', () => {
    const payload = buildChainPayload([decision], [], [order], [], [])
    const parsed = JSON.parse(JSON.stringify(payload))
    expect(parsed.decisions[0].action).toBe('BUY')
    expect(parsed.orders[0].fillPrice).toBe(60_030)
  })
})
