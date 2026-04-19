import type { MarketSnapshot, DataProvenance, DataQualityMetrics } from '@/types'

// ─── NORMALIZE BINANCE SPOT TICKER → MarketSnapshot ─────────

export interface BinanceTickerData {
  instrumentId: string
  price: number
  bid: number
  ask: number
  high24h: number
  low24h: number
  volume24h: number
  change24h: number
  change24hPct: number
  latencyMs: number
}

export const normalizeSpotTicker = (data: BinanceTickerData): MarketSnapshot => {
  const spread = data.ask - data.bid
  const spreadBps = data.price > 0 ? (spread / data.price) * 10000 : null

  const provenance: DataProvenance = {
    source: 'binance_spot',
    fetchMethod: 'ws',
    latencyMs: data.latencyMs,
    timestamp: new Date().toISOString(),
    receivedAt: new Date().toISOString(),
  }

  const quality: DataQualityMetrics = {
    completeness: 1,
    timeliness: data.latencyMs < 500 ? 1 : data.latencyMs < 2000 ? 0.7 : 0.3,
    accuracy: 1,
    consistency: 1,
  }

  return {
    instrumentId: data.instrumentId,
    price: data.price,
    bid: data.bid,
    ask: data.ask,
    spread,
    spreadBps: spreadBps != null ? Math.round(spreadBps * 100) / 100 : null,
    change24h: data.change24h,
    change24hPct: data.change24hPct,
    high24h: data.high24h,
    low24h: data.low24h,
    volume24h: data.volume24h,
    openInterest: null,
    fundingRate: null,
    nextFunding: null,
    liquidations24h: null,
    vwap: null,
    _source: 'binance_spot',
    _status: 'LIVE',
    _provenance: provenance,
    _quality: quality,
  }
}

// ─── NORMALIZE BINANCE FUTURES TICKER → MarketSnapshot ──────

export interface BinanceFuturesTickerData extends BinanceTickerData {
  openInterest: number | null
  fundingRate: number | null
  nextFundingTime: number | null
}

export const normalizeFuturesTicker = (data: BinanceFuturesTickerData): MarketSnapshot => {
  const base = normalizeSpotTicker(data)
  return {
    ...base,
    openInterest: data.openInterest,
    fundingRate: data.fundingRate,
    nextFunding: data.nextFundingTime != null ? new Date(data.nextFundingTime).toISOString() : null,
    _source: 'binance_futures',
    _provenance: {
      ...base._provenance,
      source: 'binance_futures',
    },
  }
}

// ─── NORMALIZE COINBASE TICKER → MarketSnapshot ─────────────
// Coinbase Exchange ticker payload is similar to Binance's but uses
// snake_case keys and a different shape for 24h stats. The wrapper
// here re-uses normalizeSpotTicker by remapping fields, keeping a
// single MarketSnapshot shape downstream regardless of source.

export interface CoinbaseTickerData {
  instrumentId: string
  price: number
  bid: number
  ask: number
  high24h: number
  low24h: number
  volume24h: number      // base volume (Coinbase reports base, not quote)
  open24h: number
  fetchMethod: 'rest' | 'ws'
  latencyMs: number
}

export const normalizeCoinbaseTicker = (data: CoinbaseTickerData): MarketSnapshot => {
  const change24h = data.open24h > 0 ? (data.price - data.open24h) / data.open24h : 0
  const change24hPct = change24h * 100

  const base = normalizeSpotTicker({
    instrumentId: data.instrumentId,
    price: data.price,
    bid: data.bid,
    ask: data.ask,
    high24h: data.high24h,
    low24h: data.low24h,
    volume24h: data.volume24h,
    change24h,
    change24hPct,
    latencyMs: data.latencyMs,
  })

  return {
    ...base,
    _source: 'coinbase',
    _provenance: {
      ...base._provenance,
      source: 'coinbase',
      fetchMethod: data.fetchMethod,
    },
  }
}
