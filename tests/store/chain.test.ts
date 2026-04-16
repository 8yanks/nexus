import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  saveDecision,
  saveVeto,
  saveOrder,
  savePosition,
  clearChainStores,
} from '@/storage/chain'
import type { TradeDecision, SentinelVeto } from '@/types/decision'
import type { PaperOrder } from '@/types/order'
import type { Position } from '@/types/position'

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

const position: Position = {
  id: 'p1',
  orderId: 'o1',
  decisionId: 'd1',
  instrumentId: 'BTCUSD',
  symbol: 'BTC/USD',
  side: 'long',
  size: 0.1,
  entryPrice: 60030,
  stopLoss: 58000,
  takeProfit: 65000,
  openedAt: 1002,
  closedAt: null,
  markPrice: 60500,
  unrealizedPnl: 47,
  unrealizedPnlPct: 0.78,
  realizedPnl: null,
  closeReason: null,
  status: 'open',
  _source: 'paper_broker',
  _status: 'SIMULATED',
}

beforeEach(async () => {
  await clearChainStores()
  vi.resetModules()
})

describe('useChainStore — hydration', () => {
  it('loads pre-existing decisions, vetos, orders, positions from IndexedDB', async () => {
    // Seed IDB BEFORE importing the store.
    await saveDecision(decision)
    await saveVeto(veto)
    await saveOrder(order)
    await savePosition(position)

    // Dynamic import so the seeded data is available when the store
    // wires up its hydration promise.
    const mod = await import('@/store/chain')
    const store = mod.useChainStore

    await vi.waitFor(
      () => {
        const s = store.getState()
        expect(s.decisions).toHaveLength(1)
        expect(s.orders).toHaveLength(1)
        expect(s.positions).toHaveLength(1)
        expect(s.portfolio.openCount).toBe(1)
      },
      { timeout: 2000 },
    )
    expect(store.getState().vetos[0]?.id).toBe('v1')
    expect(store.getState().positions[0]?.id).toBe('p1')
  })

  it('starts with safe mode off, autoRun off, empty review queue', async () => {
    const mod = await import('@/store/chain')
    const s = mod.useChainStore.getState()
    expect(s.safeMode).toBe(false)
    expect(s.autoRun).toBe(false)
    expect(s.reviewQueue).toEqual([])
    expect(s.lastContextInstrumentId).toBeNull()
  })
})

describe('useChainStore — toggles', () => {
  it('setSafeMode flips state and is observable', async () => {
    const mod = await import('@/store/chain')
    const store = mod.useChainStore
    expect(store.getState().safeMode).toBe(false)
    store.getState().setSafeMode(true)
    expect(store.getState().safeMode).toBe(true)
    store.getState().setSafeMode(false)
    expect(store.getState().safeMode).toBe(false)
  })

  it('setAutoRun toggles autoRun and updates the interval', async () => {
    const mod = await import('@/store/chain')
    const store = mod.useChainStore
    store.getState().setAutoRun(true, 30_000)
    expect(store.getState().autoRun).toBe(true)
    expect(store.getState().autoRunIntervalMs).toBe(30_000)
    store.getState().setAutoRun(false)
    expect(store.getState().autoRun).toBe(false)
  })

  it('dismissReview is a no-op when the id is unknown', async () => {
    const mod = await import('@/store/chain')
    const store = mod.useChainStore
    const before = store.getState().reviewQueue.length
    store.getState().dismissReview('does-not-exist')
    expect(store.getState().reviewQueue.length).toBe(before)
  })
})
