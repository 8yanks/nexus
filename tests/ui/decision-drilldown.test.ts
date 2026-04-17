import { describe, it, expect } from 'vitest'
import {
  buildDrilldown,
  parseAgreedThesis,
} from '@/ui/decision-drilldown'
import type { TradeDecision, SentinelVeto } from '@/types/decision'
import type { PaperOrder } from '@/types/order'
import type { Position } from '@/types/position'

let seq = 0
const baseDecision = (over: Partial<TradeDecision> = {}): TradeDecision => ({
  id: `dec_${seq++}`,
  timestamp: 1_700_000_000_000,
  instrumentId: 'BTCUSD',
  symbol: 'BTC/USD',
  action: 'BUY',
  size: 0.1,
  entryPrice: 60_000,
  stopLoss: 58_000,
  takeProfit: 65_000,
  confidence: 0.72,
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

const veto = (decisionId: string, over: Partial<SentinelVeto> = {}): SentinelVeto => ({
  id: `veto_${decisionId}`,
  timestamp: 1_700_000_000_000,
  decisionId,
  approved: false,
  vetoReasons: ['DATA_TOO_OLD'],
  riskMetrics: {
    currentDrawdown: 0,
    maxDrawdownLimit: 0.1,
    currentExposure: 0,
    maxExposureLimit: 1,
    dataQualityScore: 1,
    minDataQuality: 0.5,
    latencyMs: 10,
    maxLatencyMs: 500,
    brokerAvailable: true,
  },
  safeMode: false,
  _source: 'sentinel_engine',
  ...over,
})

const order = (decisionId: string, over: Partial<PaperOrder> = {}): PaperOrder => ({
  id: `ord_${decisionId}`,
  timestamp: 1_700_000_000_000,
  decisionId,
  sentinelApprovalId: 'ok',
  instrumentId: 'BTCUSD',
  symbol: 'BTC/USD',
  side: 'buy',
  type: 'market',
  size: 0.1,
  price: 60_000,
  slippage: 0,
  status: 'filled',
  fillPrice: 60_010,
  fillTime: 1_700_000_000_100,
  pnl: null,
  _source: 'paper_broker',
  _status: 'LIVE',
  ...over,
})

const position = (decisionId: string, over: Partial<Position> = {}): Position => ({
  id: `pos_${decisionId}`,
  orderId: `ord_${decisionId}`,
  decisionId,
  instrumentId: 'BTCUSD',
  symbol: 'BTC/USD',
  side: 'long',
  size: 0.1,
  entryPrice: 60_010,
  stopLoss: 58_000,
  takeProfit: 65_000,
  openedAt: 1_700_000_000_100,
  closedAt: null,
  markPrice: 60_050,
  unrealizedPnl: 4,
  unrealizedPnlPct: 0.0066,
  realizedPnl: null,
  closeReason: null,
  status: 'open',
  _source: 'paper_broker',
  _status: 'LIVE',
  ...over,
})

describe('buildDrilldown', () => {
  it('correlates veto / orders / position by decisionId', () => {
    const d = baseDecision({ id: 'd1' })
    const out = buildDrilldown(d, {
      vetos: [veto('other'), veto('d1')],
      orders: [order('other'), order('d1'), order('d1', { id: 'ord_d1_b' })],
      positions: [position('other'), position('d1')],
    })
    expect(out.veto?.decisionId).toBe('d1')
    expect(out.orders).toHaveLength(2)
    expect(out.orders.every((o) => o.decisionId === 'd1')).toBe(true)
    expect(out.position?.decisionId).toBe('d1')
  })

  it('returns nulls / empties when no matches', () => {
    const d = baseDecision({ id: 'lonely' })
    const out = buildDrilldown(d, { vetos: [], orders: [], positions: [] })
    expect(out.veto).toBeNull()
    expect(out.orders).toEqual([])
    expect(out.position).toBeNull()
    expect(out.providers).toEqual([])
    expect(out.consensus.isConsensus).toBe(false)
  })

  it('recovers per-provider theses from an agreed consensus decision', () => {
    const d = baseDecision({
      id: 'agreed',
      action: 'BUY',
      _source: 'ai_consensus',
      consensusScore: 1,
      thesis: '[claude] the setup is clean | [grok] momentum is aligned',
    })
    const out = buildDrilldown(d, { vetos: [], orders: [], positions: [] })
    expect(out.consensus.isConsensus).toBe(true)
    expect(out.consensus.isSplit).toBe(false)
    expect(out.providers).toEqual([
      { providerId: 'claude', thesis: 'the setup is clean', action: 'BUY', confidence: null },
      { providerId: 'grok', thesis: 'momentum is aligned', action: 'BUY', confidence: null },
    ])
  })

  it('recovers per-provider votes from a split HOLD', () => {
    const d = baseDecision({
      id: 'split',
      action: 'HOLD',
      size: 0,
      _source: 'ai_consensus',
      consensusScore: 0.5,
      thesis: 'consensus split (0.50 agreement) — holding',
      keyFactors: ['claude:BUY:0.80', 'grok:SELL:0.70'],
    })
    const out = buildDrilldown(d, { vetos: [], orders: [], positions: [] })
    expect(out.consensus.isSplit).toBe(true)
    expect(out.providers).toEqual([
      { providerId: 'claude', thesis: null, action: 'BUY', confidence: 0.8 },
      { providerId: 'grok', thesis: null, action: 'SELL', confidence: 0.7 },
    ])
  })

  it('returns empty providers for a non-consensus decision even if the thesis happens to contain brackets', () => {
    const d = baseDecision({
      thesis: '[note] looks interesting',
      _source: 'ai_orchestrator',
    })
    const out = buildDrilldown(d, { vetos: [], orders: [], positions: [] })
    expect(out.providers).toEqual([])
  })

  it('tolerates colon-containing provider ids in the agreed thesis', () => {
    const d = baseDecision({
      _source: 'ai_consensus',
      consensusScore: 1,
      thesis: '[claude:sonnet-4-5] primary view | [grok:grok-4] secondary',
    })
    const out = buildDrilldown(d, { vetos: [], orders: [], positions: [] })
    expect(out.providers.map((p) => p.providerId)).toEqual([
      'claude:sonnet-4-5',
      'grok:grok-4',
    ])
  })
})

describe('parseAgreedThesis', () => {
  it('returns [] for a non-bracketed thesis', () => {
    expect(parseAgreedThesis('just a free-form thesis')).toEqual([])
  })

  it('parses a single segment', () => {
    expect(parseAgreedThesis('[claude] single')).toEqual([
      { providerId: 'claude', thesis: 'single' },
    ])
  })

  it('preserves internal | inside a thesis body', () => {
    const thesis = '[claude] a | b technical read | [grok] pipes fine'
    expect(parseAgreedThesis(thesis)).toEqual([
      { providerId: 'claude', thesis: 'a | b technical read' },
      { providerId: 'grok', thesis: 'pipes fine' },
    ])
  })

  it('bails to [] when a segment header is missing its closing bracket', () => {
    // The split only fires on ` | [`, so a malformed header inside the
    // very first segment breaks the regex and the whole parse bails out.
    expect(parseAgreedThesis('[claude unclosed')).toEqual([])
  })

  it('keeps lone "| text" fragments glued to the previous thesis body', () => {
    // This is by design — thesis bodies can contain `|`, so anything not
    // preceded by ` | [` stays inside the current body.
    expect(parseAgreedThesis('[claude] ok | not-bracketed')).toEqual([
      { providerId: 'claude', thesis: 'ok | not-bracketed' },
    ])
  })
})
