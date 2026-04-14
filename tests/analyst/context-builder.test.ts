import { describe, it, expect } from 'vitest'
import {
  buildAnalystContext,
  toSentinelContext,
} from '@/analyst/context-builder'
import type { MarketSnapshot } from '@/types/market'
import type { DataQualityReport } from '@/types/quality'
import type { SignalEvent } from '@/types/signal'

const snap = (overrides: Partial<MarketSnapshot> = {}): MarketSnapshot =>
  ({
    instrumentId: 'BTCUSD',
    price: 60000,
    change24hPct: 1,
    volume24h: 100,
    high24h: 61000,
    low24h: 59000,
    timestamp: '2026-04-14T12:00:00.000Z',
    _source: 'binance',
    _status: 'LIVE',
    ...overrides,
  }) as MarketSnapshot

const quality = (score: number): DataQualityReport => ({
  instrumentId: 'BTCUSD',
  completeness: 1,
  freshness: 1,
  reliability: 1,
  overallScore: score,
  issues: [],
  _source: 'quality',
  _status: 'LIVE',
  assessedAt: '2026-04-14T12:00:00.000Z',
})

const sig = (direction: SignalEvent['direction']): SignalEvent => ({
  id: 's1',
  instrumentId: 'BTCUSD',
  type: 'RSI_OVERSOLD',
  direction,
  strength: 0.7,
  description: 'd',
  price: 60000,
  timestamp: '2026-04-14T12:00:00.000Z',
  _source: 'analyst',
  _status: 'LIVE',
})

describe('buildAnalystContext', () => {
  it('produces stable hash for identical inputs', () => {
    const a = buildAnalystContext({
      snapshot: snap(),
      signals: [sig('bullish')],
      quality: quality(0.9),
      symbol: 'BTC/USD',
    })
    const b = buildAnalystContext({
      snapshot: snap(),
      signals: [sig('bullish')],
      quality: quality(0.9),
      symbol: 'BTC/USD',
    })
    expect(a.contextHash).toBe(b.contextHash)
    expect(a.price).toBe(60000)
  })

  it('differs when signals change', () => {
    const a = buildAnalystContext({
      snapshot: snap(),
      signals: [sig('bullish')],
      quality: null,
      symbol: 'BTC/USD',
    })
    const b = buildAnalystContext({
      snapshot: snap(),
      signals: [{ ...sig('bullish'), id: 'other' }],
      quality: null,
      symbol: 'BTC/USD',
    })
    expect(a.contextHash).not.toBe(b.contextHash)
  })
})

describe('toSentinelContext', () => {
  it('computes dataAgeMs and latencyMs from snapshot and builtAt', () => {
    const ctx = buildAnalystContext({
      snapshot: snap(),
      signals: [],
      quality: quality(0.85),
      symbol: 'BTC/USD',
      now: () => Date.parse('2026-04-14T12:00:00.500Z'),
    })
    const sctx = toSentinelContext(
      ctx,
      {
        currentDrawdownPct: 2,
        currentExposurePct: 10,
        positionSizePct: 1,
        brokerAvailable: true,
        safeMode: false,
      },
      () => Date.parse('2026-04-14T12:00:01.000Z'),
    )
    expect(sctx.dataAgeMs).toBe(1000)
    expect(sctx.latencyMs).toBe(500)
    expect(sctx.dataQualityScore).toBe(0.85)
    expect(sctx.brokerAvailable).toBe(true)
  })

  it('falls back to 0 quality when report missing', () => {
    const ctx = buildAnalystContext({
      snapshot: snap(),
      signals: [],
      quality: null,
      symbol: 'BTC/USD',
    })
    const sctx = toSentinelContext(ctx, {
      currentDrawdownPct: 0,
      currentExposurePct: 0,
      positionSizePct: 0,
      brokerAvailable: false,
      safeMode: false,
    })
    expect(sctx.dataQualityScore).toBe(0)
    expect(sctx.brokerAvailable).toBe(false)
  })
})
