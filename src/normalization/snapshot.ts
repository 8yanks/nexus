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
