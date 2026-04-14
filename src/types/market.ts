import type { DataStatus, DataProvenance, DataQualityMetrics } from './quality'

export interface OHLCV {
  open: number
  high: number
  low: number
  close: number
  volume: number
  timestamp: string
  _source: string
  _status: DataStatus
}

export interface CandleSeries {
  instrumentId: string
  timeframe: string
  candles: OHLCV[]
  _source: string
  _status: DataStatus
  _provenance: DataProvenance
  generatedAt: string
}

export interface MarketSnapshot {
  instrumentId: string
  price: number
  bid: number | null
  ask: number | null
  spread: number | null
  spreadBps: number | null
  change24h: number | null
  change24hPct: number | null
  high24h: number | null
  low24h: number | null
  volume24h: number | null
  openInterest: number | null
  fundingRate: number | null
  nextFunding: string | null
  liquidations24h: number | null
  vwap: number | null
  _source: string
  _status: DataStatus
  _provenance: DataProvenance
  _quality: DataQualityMetrics
}
