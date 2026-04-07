import { describe, it, expect } from 'vitest'
import { normalizeSpotTicker, normalizeFuturesTicker } from '@/normalization/snapshot'
import type { BinanceTickerData, BinanceFuturesTickerData } from '@/normalization/snapshot'

const mkTickerData = (overrides: Partial<BinanceTickerData> = {}): BinanceTickerData => ({
  instrumentId: 'BTC-USD-SPOT',
  price: 67500,
  bid: 67490,
  ask: 67510,
  high24h: 68000,
  low24h: 66000,
  volume24h: 500_000_000,
  change24h: 800,
  change24hPct: 0.012,
  latencyMs: 15,
  ...overrides,
})

describe('Normalization — Spot Ticker', () => {
  it('normalizes price and bid/ask', () => {
    const snap = normalizeSpotTicker(mkTickerData())
    expect(snap.price).toBe(67500)
    expect(snap.bid).toBe(67490)
    expect(snap.ask).toBe(67510)
  })

  it('calculates spread', () => {
    const snap = normalizeSpotTicker(mkTickerData({ bid: 67490, ask: 67510 }))
    expect(snap.spread).toBe(20)
  })

  it('calculates spreadBps', () => {
    const snap = normalizeSpotTicker(mkTickerData({ price: 100, bid: 99, ask: 101 }))
    // spread = 2, spreadBps = (2/100)*10000 = 200
    expect(snap.spreadBps).toBe(200)
  })

  it('sets _status to LIVE', () => {
    const snap = normalizeSpotTicker(mkTickerData())
    expect(snap._status).toBe('LIVE')
  })

  it('sets _source to binance_spot', () => {
    const snap = normalizeSpotTicker(mkTickerData())
    expect(snap._source).toBe('binance_spot')
  })

  it('sets provenance with ws fetchMethod', () => {
    const snap = normalizeSpotTicker(mkTickerData({ latencyMs: 42 }))
    expect(snap._provenance.fetchMethod).toBe('ws')
    expect(snap._provenance.latencyMs).toBe(42)
    expect(snap._provenance.source).toBe('binance_spot')
  })

  it('sets quality timeliness based on latency', () => {
    const fast = normalizeSpotTicker(mkTickerData({ latencyMs: 100 }))
    expect(fast._quality.timeliness).toBe(1)

    const medium = normalizeSpotTicker(mkTickerData({ latencyMs: 1000 }))
    expect(medium._quality.timeliness).toBe(0.7)

    const slow = normalizeSpotTicker(mkTickerData({ latencyMs: 5000 }))
    expect(slow._quality.timeliness).toBe(0.3)
  })

  it('sets null for futures-specific fields', () => {
    const snap = normalizeSpotTicker(mkTickerData())
    expect(snap.openInterest).toBeNull()
    expect(snap.fundingRate).toBeNull()
    expect(snap.nextFunding).toBeNull()
  })
})

describe('Normalization — Futures Ticker', () => {
  const mkFuturesData = (overrides: Partial<BinanceFuturesTickerData> = {}): BinanceFuturesTickerData => ({
    ...mkTickerData({ instrumentId: 'BTC-PERP' }),
    openInterest: 15_000_000_000,
    fundingRate: 0.0002,
    nextFundingTime: Date.now() + 3600000,
    ...overrides,
  })

  it('includes openInterest and fundingRate', () => {
    const snap = normalizeFuturesTicker(mkFuturesData())
    expect(snap.openInterest).toBe(15_000_000_000)
    expect(snap.fundingRate).toBe(0.0002)
  })

  it('converts nextFundingTime to ISO string', () => {
    const ts = Date.now() + 7200000
    const snap = normalizeFuturesTicker(mkFuturesData({ nextFundingTime: ts }))
    expect(snap.nextFunding).toBe(new Date(ts).toISOString())
  })

  it('sets null nextFunding when nextFundingTime is null', () => {
    const snap = normalizeFuturesTicker(mkFuturesData({ nextFundingTime: null }))
    expect(snap.nextFunding).toBeNull()
  })

  it('sets _source to binance_futures', () => {
    const snap = normalizeFuturesTicker(mkFuturesData())
    expect(snap._source).toBe('binance_futures')
    expect(snap._provenance.source).toBe('binance_futures')
  })
})
