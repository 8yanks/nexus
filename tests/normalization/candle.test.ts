import { describe, it, expect } from 'vitest'
import { normalizeBinanceKline, normalizeWsKline, buildCandleSeries } from '@/normalization/candle'
import type { BinanceWsKline } from '@/normalization/candle'

describe('Normalization — Binance REST Kline', () => {
  const raw = [
    1704067200000,  // openTime
    '42000.50',     // open
    '42500.00',     // high
    '41800.00',     // low
    '42200.00',     // close
    '1234.56',      // volume
    1704070800000,  // closeTime
    '51902784.00',  // quoteAssetVolume
  ]

  it('parses OHLCV correctly', () => {
    const candle = normalizeBinanceKline(raw, 'binance_spot')
    expect(candle.open).toBe(42000.50)
    expect(candle.high).toBe(42500.00)
    expect(candle.low).toBe(41800.00)
    expect(candle.close).toBe(42200.00)
    expect(candle.volume).toBe(1234.56)
  })

  it('converts timestamp to ISO', () => {
    const candle = normalizeBinanceKline(raw, 'binance_spot')
    expect(candle.timestamp).toBe(new Date(1704067200000).toISOString())
  })

  it('sets _source and _status', () => {
    const candle = normalizeBinanceKline(raw, 'binance_futures')
    expect(candle._source).toBe('binance_futures')
    expect(candle._status).toBe('LIVE')
  })
})

describe('Normalization — Binance WS Kline', () => {
  const wsKline: BinanceWsKline = {
    t: 1704067200000,
    o: '42000.50',
    h: '42500.00',
    l: '41800.00',
    c: '42200.00',
    v: '1234.56',
    x: true,
  }

  it('parses WS kline correctly', () => {
    const candle = normalizeWsKline(wsKline, 'binance_spot')
    expect(candle.open).toBe(42000.50)
    expect(candle.high).toBe(42500.00)
    expect(candle.low).toBe(41800.00)
    expect(candle.close).toBe(42200.00)
    expect(candle.volume).toBe(1234.56)
  })

  it('sets timestamp from t field', () => {
    const candle = normalizeWsKline(wsKline, 'test')
    expect(candle.timestamp).toBe(new Date(1704067200000).toISOString())
  })
})

describe('Normalization — buildCandleSeries', () => {
  it('builds complete CandleSeries', () => {
    const candles = [
      { open: 100, high: 110, low: 90, close: 105, volume: 1000, timestamp: '2024-01-01T00:00:00Z', _source: 'test', _status: 'LIVE' as const },
    ]
    const series = buildCandleSeries('BTC-USD-SPOT', '1h', candles, 'binance_spot', 25)

    expect(series.instrumentId).toBe('BTC-USD-SPOT')
    expect(series.timeframe).toBe('1h')
    expect(series.candles).toHaveLength(1)
    expect(series._source).toBe('binance_spot')
    expect(series._status).toBe('LIVE')
    expect(series._provenance.fetchMethod).toBe('rest')
    expect(series._provenance.latencyMs).toBe(25)
    expect(series.generatedAt).toBeTruthy()
  })
})
