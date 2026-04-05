import type { OHLCV, CandleSeries, DataProvenance } from '@/types'

// ─── NORMALIZE BINANCE KLINE (REST array) → OHLCV ──────────
// Binance REST klines return arrays: [openTime, open, high, low, close, volume, closeTime, ...]

export const normalizeBinanceKline = (
  raw: (string | number)[],
  source: string,
): OHLCV => ({
  open: Number(raw[1]),
  high: Number(raw[2]),
  low: Number(raw[3]),
  close: Number(raw[4]),
  volume: Number(raw[5]),
  timestamp: new Date(Number(raw[0])).toISOString(),
  _source: source,
  _status: 'LIVE',
})

// ─── NORMALIZE BINANCE WS KLINE → OHLCV ────────────────────
// WS kline events have a nested `k` object

export interface BinanceWsKline {
  t: number   // kline start time
  o: string   // open
  h: string   // high
  l: string   // low
  c: string   // close
  v: string   // volume
  x: boolean  // is final (closed)
}

export const normalizeWsKline = (
  k: BinanceWsKline,
  source: string,
): OHLCV => ({
  open: Number(k.o),
  high: Number(k.h),
  low: Number(k.l),
  close: Number(k.c),
  volume: Number(k.v),
  timestamp: new Date(k.t).toISOString(),
  _source: source,
  _status: 'LIVE',
})

// ─── BUILD CANDLE SERIES ────────────────────────────────────

export const buildCandleSeries = (
  instrumentId: string,
  timeframe: string,
  candles: OHLCV[],
  source: string,
  latencyMs: number,
): CandleSeries => {
  const provenance: DataProvenance = {
    source,
    fetchMethod: 'rest',
    latencyMs,
    timestamp: new Date().toISOString(),
    receivedAt: new Date().toISOString(),
  }

  return {
    instrumentId,
    timeframe,
    candles,
    _source: source,
    _status: 'LIVE',
    _provenance: provenance,
    generatedAt: new Date().toISOString(),
  }
}
