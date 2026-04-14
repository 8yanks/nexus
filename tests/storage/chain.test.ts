import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveDecision,
  saveVeto,
  saveOrder,
  saveAuditEntries,
  loadDecisions,
  loadVetos,
  loadOrders,
  loadAuditEntries,
  clearChainStores,
} from '@/storage/chain'
import type { TradeDecision, SentinelVeto } from '@/types/decision'
import type { PaperOrder } from '@/types/order'
import type { AuditEntry } from '@/types/audit'

const decision: TradeDecision = {
  id: 'd1',
  timestamp: 1000,
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
}

const veto: SentinelVeto = {
  id: 'v1',
  timestamp: 1001,
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
}

const order: PaperOrder = {
  id: 'o1',
  timestamp: 1002,
  decisionId: 'd1',
  sentinelApprovalId: 'v1',
  instrumentId: 'BTCUSD',
  symbol: 'BTC/USD',
  side: 'buy',
  type: 'limit',
  size: 0.1,
  price: 60000,
  slippage: 0.0005,
  status: 'filled',
  fillPrice: 60030,
  fillTime: 1002,
  pnl: 0,
  _source: 'paper_broker',
  _status: 'SIMULATED',
}

const entries: AuditEntry[] = [
  {
    id: 'a1',
    timestamp: 999,
    eventType: 'DECISION_CREATED',
    module: 'ai',
    summary: 'created',
    data: {},
    _source: 'ai_orchestrator',
  },
]

beforeEach(async () => {
  await clearChainStores()
})

describe('storage/chain', () => {
  it('round-trips decisions, vetos, orders, audit', async () => {
    await saveDecision(decision)
    await saveVeto(veto)
    await saveOrder(order)
    await saveAuditEntries(entries)

    expect(await loadDecisions()).toHaveLength(1)
    expect((await loadVetos())[0].id).toBe('v1')
    expect((await loadOrders())[0].fillPrice).toBe(60030)
    expect((await loadAuditEntries())[0].eventType).toBe('DECISION_CREATED')
  })

  it('clearChainStores wipes everything', async () => {
    await saveDecision(decision)
    await saveAuditEntries(entries)
    await clearChainStores()
    expect(await loadDecisions()).toHaveLength(0)
    expect(await loadAuditEntries()).toHaveLength(0)
  })
})
