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

// Coinbase Exchange `/products/{id}/candles` only accepts a fixed set
// of granularity values: 60s, 300s, 900s, 3600s, 21600s, 86400s. That's
// 1m / 5m / 15m / 1h / 6h / 1d — note the absence of a native 4h. When
// the user picks 4h we let the provider chain fall through to the next
// source (Binance/Kraken) rather than synthesise it client-side.
const TF_TO_GRANULARITY: Record<string, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '1d': 86400,
}

// Same TTL story as the Binance providers — see binance/spot.ts.
const REST_TF_TTL_MS = 60_000

// ─── INTERNAL STATE ─────────────────────────────────────────

interface SpotState {
  snapshots: Map<string, MarketSnapshot>
  candles: Map<string, OHLCV[]>          // 1h, REST-seeded (no kline WS on Coinbase)
  /** Per-(id, tf) REST cache for non-1h timeframes — see binance/spot.ts. */
  candlesByTf: Map<string, OHLCV[]>
  candlesByTfStamp: Map<string, number>
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

/** Coinbase returns candles in DESCENDING time order — flip + remap. */
const fetchAndNormalizeCandles = async (
  productId: string,
  granularity: number,
): Promise<OHLCV[]> => {
  const raw = await fetchCandles(productId, granularity)
  return raw.slice().reverse().map(normalizeCoinbaseCandle)
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
    candlesByTf: new Map(),
    candlesByTfStamp: new Map(),
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
          // The shared helper handles flip + remap so the per-TF code path
          // and the connect-time warm-up stay in sync.
          const candles = await fetchAndNormalizeCandles(productId, CANDLE_GRANULARITY_1H)
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
    // 1h is the connect-time-seeded path. Coinbase has no kline WS,
    // so even 1h is technically REST-derived, but we keep it in its
    // own slot so the connect-time warm-up is still useful and the
    // per-(id, tf) cache below stays focused on user-driven TFs.
    if (timeframe === '1h') {
      const cached = state.candles.get(instrumentId) ?? []
      const sliced = cached.slice(-limit)
      return buildCandleSeries(instrumentId, timeframe, sliced, 'coinbase', 0)
    }

    const granularity = TF_TO_GRANULARITY[timeframe]
    if (granularity == null) {
      // Unsupported TF (e.g. 4h) — let the chain fall through to the
      // next provider in store/refreshAll instead of returning bad data.
      throw new Error(`Coinbase does not support timeframe: ${timeframe}`)
    }

    const productId = toCoinbaseProductId(instrumentId)
    if (!productId) throw new Error(`No Coinbase mapping for ${instrumentId}`)

    const key = `${instrumentId}|${timeframe}`
    const cached = state.candlesByTf.get(key)
    const stamp = state.candlesByTfStamp.get(key) ?? 0
    if (cached && Date.now() - stamp < REST_TF_TTL_MS) {
      return buildCandleSeries(instrumentId, timeframe, cached.slice(-limit), 'coinbase', 0)
    }

    try {
      const candles = await fetchAndNormalizeCandles(productId, granularity)
      state.candlesByTf.set(key, candles)
      state.candlesByTfStamp.set(key, Date.now())
      return buildCandleSeries(instrumentId, timeframe, candles.slice(-limit), 'coinbase', 0)
    } catch (err) {
      if (cached) {
        return buildCandleSeries(instrumentId, timeframe, cached.slice(-limit), 'coinbase', 0)
      }
      throw err
    }
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
