import type { AssetClass, MarketSnapshot, CandleSeries } from '@/types'
import type { BaseProvider, HealthCheckResult } from '../base'
import type {
  BinanceRestTicker,
  BinanceWsTickerEvent,
  BinanceWsKlineEvent,
  BinanceWsCombinedStream,
} from './types'
import { createWsManager } from './ws'
import type { WsManager } from './ws'
import {
  getSpotInstrumentIds,
  toBinanceSymbol,
  fromBinanceSpotSymbol,
} from '@/normalization/instrument'
import { normalizeSpotTicker } from '@/normalization/snapshot'
import type { BinanceTickerData } from '@/normalization/snapshot'
import { normalizeBinanceKline, normalizeWsKline, buildCandleSeries } from '@/normalization/candle'
import type { OHLCV } from '@/types'

// ─── CONSTANTS ──────────────────────────────────────────────

const REST_BASE = 'https://api.binance.com'
const WS_BASE = 'wss://stream.binance.com:9443'

// ─── INTERNAL STATE ─────────────────────────────────────────

interface SpotState {
  snapshots: Map<string, MarketSnapshot>        // instrumentId → snapshot
  candles: Map<string, OHLCV[]>                 // instrumentId → candle array
  wsManager: WsManager | null
  lastPing: number
}

// ─── REST HELPERS ───────────────────────────────────────────

const fetchTicker = async (binanceSymbol: string): Promise<BinanceRestTicker> => {
  const res = await fetch(`${REST_BASE}/api/v3/ticker/24hr?symbol=${binanceSymbol}`)
  if (!res.ok) throw new Error(`Binance REST error: ${res.status}`)
  return res.json() as Promise<BinanceRestTicker>
}

const fetchKlines = async (
  binanceSymbol: string,
  interval: string,
  limit: number,
): Promise<(string | number)[][]> => {
  const res = await fetch(
    `${REST_BASE}/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`,
  )
  if (!res.ok) throw new Error(`Binance REST klines error: ${res.status}`)
  return res.json() as Promise<(string | number)[][]>
}

// ─── PROVIDER FACTORY ───────────────────────────────────────

export const createBinanceSpotProvider = (): BaseProvider => {
  const state: SpotState = {
    snapshots: new Map(),
    candles: new Map(),
    wsManager: null,
    lastPing: 0,
  }

  const instrumentIds = getSpotInstrumentIds()

  const handleWsMessage = (msg: BinanceWsCombinedStream): void => {
    const stream = msg.stream
    const data = msg.data

    // Ticker stream: <symbol>@ticker
    if (stream.endsWith('@ticker')) {
      const evt = data as BinanceWsTickerEvent
      const instrumentId = fromBinanceSpotSymbol(evt.s)
      if (!instrumentId) return

      const tickerData: BinanceTickerData = {
        instrumentId,
        price: Number(evt.c),
        bid: Number(evt.b),
        ask: Number(evt.a),
        high24h: Number(evt.h),
        low24h: Number(evt.l),
        volume24h: Number(evt.q),  // quote volume
        change24h: Number(evt.p) / Number(evt.c),  // abs change → ratio
        change24hPct: Number(evt.P),
        latencyMs: Date.now() - evt.E,
      }
      state.snapshots.set(instrumentId, normalizeSpotTicker(tickerData))
    }

    // Kline stream: <symbol>@kline_1h
    if (stream.includes('@kline_')) {
      const evt = data as BinanceWsKlineEvent
      const instrumentId = fromBinanceSpotSymbol(evt.s)
      if (!instrumentId) return

      const candle = normalizeWsKline(
        {
          t: evt.k.t,
          o: evt.k.o,
          h: evt.k.h,
          l: evt.k.l,
          c: evt.k.c,
          v: evt.k.v,
          x: evt.k.x,
        },
        'binance_spot',
      )

      const existing = state.candles.get(instrumentId) ?? []

      if (evt.k.x) {
        // Candle closed — push new candle, trim to 200
        existing.push(candle)
        if (existing.length > 200) existing.shift()
      } else if (existing.length > 0) {
        // Update current (last) candle in-place
        existing[existing.length - 1] = candle
      }

      state.candles.set(instrumentId, existing)
    }
  }

  const connect = async (): Promise<void> => {
    // 1. Fetch initial data via REST
    await Promise.all(
      instrumentIds.map(async (id) => {
        const sym = toBinanceSymbol(id)
        if (!sym) return

        try {
          // Ticker
          const t0 = Date.now()
          const ticker = await fetchTicker(sym)
          const latency = Date.now() - t0

          const tickerData: BinanceTickerData = {
            instrumentId: id,
            price: Number(ticker.lastPrice),
            bid: Number(ticker.bidPrice),
            ask: Number(ticker.askPrice),
            high24h: Number(ticker.highPrice),
            low24h: Number(ticker.lowPrice),
            volume24h: Number(ticker.quoteVolume),
            change24h: Number(ticker.priceChange) / Number(ticker.lastPrice),
            change24hPct: Number(ticker.priceChangePercent),
            latencyMs: latency,
          }
          state.snapshots.set(id, normalizeSpotTicker(tickerData))

          // Klines
          const raw = await fetchKlines(sym, '1h', 200)
          const candles = raw.map((k) => normalizeBinanceKline(k, 'binance_spot'))
          state.candles.set(id, candles)
        } catch (err) {
          console.error(`[Binance Spot] Failed to init ${id}:`, err)
        }
      }),
    )

    // 2. Open WebSocket for live updates
    const streams: string[] = []
    for (const id of instrumentIds) {
      const sym = toBinanceSymbol(id)?.toLowerCase()
      if (!sym) continue
      streams.push(`${sym}@ticker`)
      streams.push(`${sym}@kline_1h`)
    }

    state.wsManager = createWsManager({
      baseUrl: WS_BASE,
      streams,
      onMessage: handleWsMessage,
      onOpen: () => { state.lastPing = Date.now() },
    })

    state.wsManager.connect()
  }

  const disconnect = async (): Promise<void> => {
    state.wsManager?.disconnect()
    state.wsManager = null
  }

  const getSnapshot = async (instrumentId: string): Promise<MarketSnapshot> => {
    const cached = state.snapshots.get(instrumentId)
    if (cached) return cached
    throw new Error(`No snapshot for ${instrumentId}`)
  }

  const getCandles = async (
    instrumentId: string,
    timeframe: string,
    limit: number,
  ): Promise<CandleSeries> => {
    const cached = state.candles.get(instrumentId) ?? []
    const sliced = cached.slice(-limit)
    return buildCandleSeries(instrumentId, timeframe, sliced, 'binance_spot', 0)
  }

  const healthCheck = async (): Promise<HealthCheckResult> => {
    try {
      const t0 = Date.now()
      const res = await fetch(`${REST_BASE}/api/v3/ping`)
      const latencyMs = Date.now() - t0
      return { ok: res.ok, latencyMs }
    } catch (err) {
      return { ok: false, latencyMs: 0, error: err instanceof Error ? err.message : 'Unknown' }
    }
  }

  return {
    id: 'binance_spot',
    name: 'Binance Spot',
    status: 'active',
    markets: ['crypto_spot'] as AssetClass[],
    connect,
    disconnect,
    getSnapshot,
    getCandles,
    healthCheck,
  }
}
