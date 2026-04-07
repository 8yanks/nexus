import { describe, it, expect } from 'vitest'
import { generateCandles, generateSnapshot } from '@/providers/mock/generator'
import type { Instrument } from '@/types'

const mkInstrument = (id: string, assetClass: Instrument['assetClass'] = 'crypto_spot'): Instrument => ({
  id,
  symbol: id,
  name: id,
  assetClass,
  exchange: 'Test',
  baseCurrency: 'BTC',
  quoteCurrency: 'USD',
  contractType: assetClass === 'crypto_perp' ? 'perpetual' : 'spot',
  tickSize: 0.01,
  lotSize: 0.001,
  metadata: { listingDate: '2020-01-01', sector: null },
})

describe('Mock Generator — generateCandles', () => {
  it('generates correct number of candles', () => {
    const series = generateCandles('BTC-USD-SPOT', '1h', 50)
    expect(series.candles).toHaveLength(50)
  })

  it('defaults to 100 candles', () => {
    const series = generateCandles('BTC-USD-SPOT')
    expect(series.candles).toHaveLength(100)
  })

  it('sets instrumentId and timeframe', () => {
    const series = generateCandles('ETH-USD-SPOT', '4h', 10)
    expect(series.instrumentId).toBe('ETH-USD-SPOT')
    expect(series.timeframe).toBe('4h')
  })

  it('candles have ascending timestamps', () => {
    const series = generateCandles('BTC-USD-SPOT', '1h', 20)
    for (let i = 1; i < series.candles.length; i++) {
      expect(series.candles[i].timestamp > series.candles[i - 1].timestamp).toBe(true)
    }
  })

  it('candles have valid OHLCV structure', () => {
    const series = generateCandles('BTC-USD-SPOT', '1h', 5)
    for (const c of series.candles) {
      expect(c.open).toBeGreaterThan(0)
      expect(c.high).toBeGreaterThanOrEqual(c.low)
      expect(c.volume).toBeGreaterThan(0)
      expect(c._source).toBe('mock_provider')
      expect(c._status).toBe('SIMULATED')
    }
  })

  it('uses base price for known instruments', () => {
    const series = generateCandles('BTC-USD-SPOT', '1h', 5)
    // BTC base is ~67842, price should be in reasonable range
    const avg = series.candles.reduce((s, c) => s + c.close, 0) / series.candles.length
    expect(avg).toBeGreaterThan(50000)
    expect(avg).toBeLessThan(100000)
  })

  it('falls back to 100 for unknown instruments', () => {
    const series = generateCandles('UNKNOWN', '1h', 5)
    const avg = series.candles.reduce((s, c) => s + c.close, 0) / series.candles.length
    expect(avg).toBeGreaterThan(50)
    expect(avg).toBeLessThan(200)
  })

  it('sets provenance and status', () => {
    const series = generateCandles('BTC-USD-SPOT')
    expect(series._source).toBe('mock_provider')
    expect(series._status).toBe('SIMULATED')
    expect(series._provenance.fetchMethod).toBe('mock')
    expect(series.generatedAt).toBeTruthy()
  })
})

describe('Mock Generator — generateSnapshot', () => {
  it('generates snapshot with valid price', () => {
    const snap = generateSnapshot(mkInstrument('BTC-USD-SPOT'))
    expect(snap.price).toBeGreaterThan(0)
    expect(snap.instrumentId).toBe('BTC-USD-SPOT')
  })

  it('sets bid < price < ask', () => {
    const snap = generateSnapshot(mkInstrument('BTC-USD-SPOT'))
    expect(snap.bid).toBeLessThan(snap.price)
    expect(snap.ask).toBeGreaterThan(snap.price)
  })

  it('calculates spread and spreadBps', () => {
    const snap = generateSnapshot(mkInstrument('BTC-USD-SPOT'))
    expect(snap.spread).toBeGreaterThan(0)
    expect(snap.spreadBps).toBeGreaterThan(0)
  })

  it('sets openInterest for crypto', () => {
    const snap = generateSnapshot(mkInstrument('BTC-USD-SPOT', 'crypto_spot'))
    expect(snap.openInterest).not.toBeNull()
  })

  it('sets fundingRate for perps', () => {
    const snap = generateSnapshot(mkInstrument('BTC-PERP', 'crypto_perp'))
    expect(snap.fundingRate).not.toBeNull()
    expect(snap.nextFunding).not.toBeNull()
  })

  it('nulls fundingRate for non-perp', () => {
    const snap = generateSnapshot(mkInstrument('AAPL', 'us_equity'))
    expect(snap.fundingRate).toBeNull()
    expect(snap.nextFunding).toBeNull()
    expect(snap.openInterest).toBeNull()
  })

  it('sets status to SIMULATED', () => {
    const snap = generateSnapshot(mkInstrument('BTC-USD-SPOT'))
    expect(snap._status).toBe('SIMULATED')
    expect(snap._source).toBe('mock_provider')
  })

  it('quality completeness is higher for perps (more fields)', () => {
    const perp = generateSnapshot(mkInstrument('BTC-PERP', 'crypto_perp'))
    const equity = generateSnapshot(mkInstrument('AAPL', 'us_equity'))
    expect(perp._quality.completeness).toBeGreaterThan(equity._quality.completeness)
  })
})
