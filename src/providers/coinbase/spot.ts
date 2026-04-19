import type { AssetClass, MarketSnapshot, CandleSeries, OHLCV } from '@/types'
import type { BaseProvider, HealthCheckResult } from '../base'
import type {
  CoinbaseRestTicker,
  CoinbaseRest24hStats,
  CoinbaseRestCandle,
  CoinbaseWsEvent,
  CoinbaseWsTickerEvent,
} from './types'
import { createCoinbaseWsManager } from './ws'
import type { CoinbaseWsManager } from './ws'
import {
  getCoinbaseInstrumentIds,
  toCoinbaseProductId,
  fromCoinbaseProductId,
} from '@/normalization/instrument'
import { normalizeCoinbaseTicker } from '@/normalization/snapshot'
import { buildCandleSeries } from '@/normalization/candle'

// ─── CONSTANTS ──────────────────────────────────────────────
// Public market-data endpoints — no API key required, browser CORS OK.

const REST_BASE = 'https://api.exchange.coinbase.com'
const WS_URL = 'wss://ws-feed.exchange.coinbase.com'
const CANDLE_GRANULARITY_1H = 3600

// ─── INTERNAL STATE ─────────────────────────────────────────

interface SpotState {
  snapshots: Map<string, MarketSnapshot>
  candles: Map<string, OHLCV[]>
  open24h: Map<string, number>          // product_id → 24h open (for WS change calc)
  wsManager: CoinbaseWsManager | null
}

// ─── REST HELPERS ───────────────────────────────────────────

const fetchTicker = async (productId: string): Promise<CoinbaseRestTicker> => {
  const res = await fetch(`${REST_BASE}/products/${productId}/ticker`)
  if (!res.ok) throw new Error(`Coinbase ticker error: ${res.status}`)
  return res.json() as Promise<CoinbaseRestTicker>
}

const fetch24hStats = async (productId: string): Promise<CoinbaseRest24hStats> => {
  const res = await fetch(`${REST_BASE}/products/${productId}/stats`)
  if (!res.ok) throw new Error(`Coinbase stats error: ${res.status}`)
  return res.json() as Promise<CoinbaseRest24hStats>
}

const fetchCandles = async (
  productId: string,
  granularity: number,
): Promise<CoinbaseRestCandle[]> => {
  const res = await fetch(
    `${REST_BASE}/products/${productId}/candles?granularity=${granularity}`,
  )
  if (!res.ok) throw new Error(`Coinbase candles error: ${res.status}`)
  return res.json() as Promise<CoinbaseRestCandle[]>
}

// Coinbase candles arrive as [time(s), low, high, open, close, volume]
// in DESCENDING time order — flip + remap to OHLCV.
const normalizeCoinbaseCandle = (raw: CoinbaseRestCandle): OHLCV => ({
  open: raw[3],
  high: raw[2],
  low: raw[1],
  close: raw[4],
  volume: raw[5],
  timestamp: new Date(raw[0] * 1000).toISOString(),
  _source: 'coinbase',
  _status: 'LIVE',
})

// ─── PROVIDER FACTORY ───────────────────────────────────────

export const createCoinbaseSpotProvider = (): BaseProvider => {
  const state: SpotState = {
    snapshots: new Map(),
    candles: new Map(),
    open24h: new Map(),
    wsManager: null,
  }

  const instrumentIds = getCoinbaseInstrumentIds()

  const handleWsMessage = (msg: CoinbaseWsEvent): void => {
    if (msg.type !== 'ticker') return
    const evt = msg as CoinbaseWsTickerEvent
    const instrumentId = fromCoinbaseProductId(evt.product_id)
    if (!instrumentId) return

    const open = Number(evt.open_24h)
    state.open24h.set(evt.product_id, open)

    const eventTimeMs = new Date(evt.time).getTime()
    const latencyMs = Math.max(0, Date.now() - eventTimeMs)

    state.snapshots.set(
      instrumentId,
      normalizeCoinbaseTicker({
        instrumentId,
        price: Number(evt.price),
        bid: Number(evt.best_bid),
        ask: Number(evt.best_ask),
        high24h: Number(evt.high_24h),
        low24h: Number(evt.low_24h),
        volume24h: Number(evt.volume_24h),
        open24h: open,
        fetchMethod: 'ws',
        latencyMs,
      }),
    )
  }

  const connect = async (): Promise<void> => {
    // 1. Fetch initial snapshot + candles via REST.
    await Promise.all(
      instrumentIds.map(async (id) => {
        const productId = toCoinbaseProductId(id)
        if (!productId) return

        try {
          const t0 = Date.now()
          const [ticker, stats] = await Promise.all([
            fetchTicker(productId),
            fetch24hStats(productId),
          ])
          const latency = Date.now() - t0
          const open = Number(stats.open)
          state.open24h.set(productId, open)

          state.snapshots.set(
            id,
            normalizeCoinbaseTicker({
              instrumentId: id,
              price: Number(ticker.price),
              bid: Number(ticker.bid),
              ask: Number(ticker.ask),
              high24h: Number(stats.high),
              low24h: Number(stats.low),
              volume24h: Number(stats.volume),
              open24h: open,
              fetchMethod: 'rest',
              latencyMs: latency,
            }),
          )

          // Candles — Coinbase returns up to 300 in DESCENDING time order.
          // Reverse so the newest is last (matches Binance + downstream code).
          const raw = await fetchCandles(productId, CANDLE_GRANULARITY_1H)
          const candles = raw
            .slice()
            .reverse()
            .map(normalizeCoinbaseCandle)
          state.candles.set(id, candles)
        } catch (err) {
          console.error(`[Coinbase] Failed to init ${id}:`, err)
        }
      }),
    )

    // 2. Open WebSocket for live ticker updates.
    const productIds = instrumentIds
      .map(toCoinbaseProductId)
      .filter((p): p is string => p != null)

    if (productIds.length > 0) {
      state.wsManager = createCoinbaseWsManager({
        url: WS_URL,
        productIds,
        channels: ['ticker'],
        onMessage: handleWsMessage,
      })
      state.wsManager.connect()
    }
  }

  const disconnect = async (): Promise<void> => {
    state.wsManager?.disconnect()
    state.wsManager = null
  }

  const getSnapshot = async (instrumentId: string): Promise<MarketSnapshot> => {
    const cached = state.snapshots.get(instrumentId)
    if (cached) return cached
    throw new Error(`No Coinbase snapshot for ${instrumentId}`)
  }

  const getCandles = async (
    instrumentId: string,
    timeframe: string,
    limit: number,
  ): Promise<CandleSeries> => {
    const cached = state.candles.get(instrumentId) ?? []
    const sliced = cached.slice(-limit)
    return buildCandleSeries(instrumentId, timeframe, sliced, 'coinbase', 0)
  }

  const healthCheck = async (): Promise<HealthCheckResult> => {
    try {
      const t0 = Date.now()
      const res = await fetch(`${REST_BASE}/time`)
      const latencyMs = Date.now() - t0
      return { ok: res.ok, latencyMs }
    } catch (err) {
      return { ok: false, latencyMs: 0, error: err instanceof Error ? err.message : 'Unknown' }
    }
  }

  return {
    id: 'coinbase',
    name: 'Coinbase Exchange',
    status: 'active',
    markets: ['crypto_spot'] as AssetClass[],
    connect,
    disconnect,
    getSnapshot,
    getCandles,
    healthCheck,
  }
}
