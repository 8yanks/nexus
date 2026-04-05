import type { AssetClass, MarketSnapshot, CandleSeries } from '@/types'
import type { BaseProvider, HealthCheckResult } from '../base'
import type {
  BinanceFuturesRestTicker,
  BinancePremiumIndex,
  BinanceFuturesOI,
  BinanceBookTicker,
  BinanceWsTickerEvent,
  BinanceWsKlineEvent,
  BinanceWsMarkPriceEvent,
  BinanceWsCombinedStream,
} from './types'
import { createWsManager } from './ws'
import type { WsManager } from './ws'
import {
  getFuturesInstrumentIds,
  toBinanceSymbol,
  fromBinanceFuturesSymbol,
} from '@/normalization/instrument'
import { normalizeFuturesTicker } from '@/normalization/snapshot'
import type { BinanceFuturesTickerData } from '@/normalization/snapshot'
import { normalizeBinanceKline, normalizeWsKline, buildCandleSeries } from '@/normalization/candle'
import type { OHLCV } from '@/types'

// ─── CONSTANTS ──────────────────────────────────────────────

const REST_BASE = 'https://fapi.binance.com'
const WS_BASE = 'wss://fstream.binance.com'

// ─── INTERNAL STATE ─────────────────────────────────────────

interface FuturesState {
  snapshots: Map<string, MarketSnapshot>
  candles: Map<string, OHLCV[]>
  funding: Map<string, { rate: number; nextTime: number }>
  oi: Map<string, number>
  book: Map<string, { bid: number; ask: number }>
  wsManager: WsManager | null
  lastPing: number
}

// ─── REST HELPERS ───────────────────────────────────────────

const fetchTicker = async (sym: string): Promise<BinanceFuturesRestTicker> => {
  const res = await fetch(`${REST_BASE}/fapi/v1/ticker/24hr?symbol=${sym}`)
  if (!res.ok) throw new Error(`Binance Futures ticker error: ${res.status}`)
  return res.json() as Promise<BinanceFuturesRestTicker>
}

const fetchPremiumIndex = async (sym: string): Promise<BinancePremiumIndex> => {
  const res = await fetch(`${REST_BASE}/fapi/v1/premiumIndex?symbol=${sym}`)
  if (!res.ok) throw new Error(`Binance Futures premiumIndex error: ${res.status}`)
  return res.json() as Promise<BinancePremiumIndex>
}

const fetchOI = async (sym: string): Promise<BinanceFuturesOI> => {
  const res = await fetch(`${REST_BASE}/fapi/v1/openInterest?symbol=${sym}`)
  if (!res.ok) throw new Error(`Binance Futures OI error: ${res.status}`)
  return res.json() as Promise<BinanceFuturesOI>
}

const fetchBookTicker = async (sym: string): Promise<BinanceBookTicker> => {
  const res = await fetch(`${REST_BASE}/fapi/v1/ticker/bookTicker?symbol=${sym}`)
  if (!res.ok) throw new Error(`Binance Futures bookTicker error: ${res.status}`)
  return res.json() as Promise<BinanceBookTicker>
}

const fetchKlines = async (
  sym: string,
  interval: string,
  limit: number,
): Promise<(string | number)[][]> => {
  const res = await fetch(
    `${REST_BASE}/fapi/v1/klines?symbol=${sym}&interval=${interval}&limit=${limit}`,
  )
  if (!res.ok) throw new Error(`Binance Futures klines error: ${res.status}`)
  return res.json() as Promise<(string | number)[][]>
}

// ─── PROVIDER FACTORY ───────────────────────────────────────

export const createBinanceFuturesProvider = (): BaseProvider => {
  const state: FuturesState = {
    snapshots: new Map(),
    candles: new Map(),
    funding: new Map(),
    oi: new Map(),
    book: new Map(),
    wsManager: null,
    lastPing: 0,
  }

  const instrumentIds = getFuturesInstrumentIds()

  const buildSnapshot = (instrumentId: string, tickerData: Omit<BinanceFuturesTickerData, 'openInterest' | 'fundingRate' | 'nextFundingTime'>): MarketSnapshot => {
    const f = state.funding.get(instrumentId)
    const oi = state.oi.get(instrumentId)
    const bk = state.book.get(instrumentId)

    // Use book ticker bid/ask if available, otherwise fall back to tickerData values
    const bid = bk && bk.bid > 0 ? bk.bid : tickerData.bid
    const ask = bk && bk.ask > 0 ? bk.ask : tickerData.ask

    const fullData: BinanceFuturesTickerData = {
      ...tickerData,
      bid,
      ask,
      openInterest: oi ?? null,
      fundingRate: f?.rate ?? null,
      nextFundingTime: f?.nextTime ?? null,
    }

    return normalizeFuturesTicker(fullData)
  }

  const handleWsMessage = (msg: BinanceWsCombinedStream): void => {
    const stream = msg.stream
    const data = msg.data

    // Ticker
    if (stream.endsWith('@ticker')) {
      const evt = data as BinanceWsTickerEvent
      const instrumentId = fromBinanceFuturesSymbol(evt.s)
      if (!instrumentId) return

      const price = Number(evt.c)
      // Futures WS ticker does NOT have b/a fields — use book state
      const bk = state.book.get(instrumentId)

      state.snapshots.set(
        instrumentId,
        buildSnapshot(instrumentId, {
          instrumentId,
          price,
          bid: bk?.bid ?? price,
          ask: bk?.ask ?? price,
          high24h: Number(evt.h),
          low24h: Number(evt.l),
          volume24h: Number(evt.q),
          change24h: Number(evt.p) / price,
          change24hPct: Number(evt.P),
          latencyMs: Date.now() - evt.E,
        }),
      )
    }

    // Book ticker (bid/ask)
    if (stream.endsWith('@bookTicker')) {
      const evt = data as { s: string; b: string; a: string }
      const instrumentId = fromBinanceFuturesSymbol(evt.s)
      if (!instrumentId) return

      state.book.set(instrumentId, {
        bid: Number(evt.b),
        ask: Number(evt.a),
      })
    }

    // Mark price + funding
    if (stream.endsWith('@markPrice')) {
      const evt = data as BinanceWsMarkPriceEvent
      const instrumentId = fromBinanceFuturesSymbol(evt.s)
      if (!instrumentId) return

      state.funding.set(instrumentId, {
        rate: Number(evt.r),
        nextTime: evt.T,
      })

      // Re-build snapshot with updated funding
      const existing = state.snapshots.get(instrumentId)
      if (existing) {
        state.snapshots.set(
          instrumentId,
          buildSnapshot(instrumentId, {
            instrumentId,
            price: existing.price,
            bid: existing.bid ?? existing.price,
            ask: existing.ask ?? existing.price,
            high24h: existing.high24h ?? existing.price,
            low24h: existing.low24h ?? existing.price,
            volume24h: existing.volume24h ?? 0,
            change24h: existing.change24h ?? 0,
            change24hPct: existing.change24hPct ?? 0,
            latencyMs: 0,
          }),
        )
      }
    }

    // Kline
    if (stream.includes('@kline_')) {
      const evt = data as BinanceWsKlineEvent
      const instrumentId = fromBinanceFuturesSymbol(evt.s)
      if (!instrumentId) return

      const candle = normalizeWsKline(
        { t: evt.k.t, o: evt.k.o, h: evt.k.h, l: evt.k.l, c: evt.k.c, v: evt.k.v, x: evt.k.x },
        'binance_futures',
      )

      const existing = state.candles.get(instrumentId) ?? []
      if (evt.k.x) {
        existing.push(candle)
        if (existing.length > 200) existing.shift()
      } else if (existing.length > 0) {
        existing[existing.length - 1] = candle
      }
      state.candles.set(instrumentId, existing)
    }
  }

  const connect = async (): Promise<void> => {
    // 1. REST bootstrap
    await Promise.all(
      instrumentIds.map(async (id) => {
        const sym = toBinanceSymbol(id)
        if (!sym) return

        try {
          const t0 = Date.now()
          const [ticker, premium, oi, book, rawKlines] = await Promise.all([
            fetchTicker(sym),
            fetchPremiumIndex(sym),
            fetchOI(sym),
            fetchBookTicker(sym),
            fetchKlines(sym, '1h', 200),
          ])
          const latency = Date.now() - t0

          state.funding.set(id, {
            rate: Number(premium.lastFundingRate),
            nextTime: premium.nextFundingTime,
          })
          state.oi.set(id, Number(oi.openInterest) * Number(ticker.lastPrice))

          const price = Number(ticker.lastPrice)
          const bid = Number(book.bidPrice)
          const ask = Number(book.askPrice)

          state.snapshots.set(
            id,
            buildSnapshot(id, {
              instrumentId: id,
              price,
              bid: bid > 0 ? bid : price,
              ask: ask > 0 ? ask : price,
              high24h: Number(ticker.highPrice),
              low24h: Number(ticker.lowPrice),
              volume24h: Number(ticker.quoteVolume),
              change24h: Number(ticker.priceChange) / price,
              change24hPct: Number(ticker.priceChangePercent),
              latencyMs: latency,
            }),
          )

          const candles = rawKlines.map((k) => normalizeBinanceKline(k, 'binance_futures'))
          state.candles.set(id, candles)
        } catch (err) {
          console.error(`[Binance Futures] Failed to init ${id}:`, err)
        }
      }),
    )

    // 2. WebSocket
    const streams: string[] = []
    for (const id of instrumentIds) {
      const sym = toBinanceSymbol(id)?.toLowerCase()
      if (!sym) continue
      streams.push(`${sym}@ticker`)
      streams.push(`${sym}@kline_1h`)
      streams.push(`${sym}@markPrice`)
      streams.push(`${sym}@bookTicker`)
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
    return buildCandleSeries(instrumentId, timeframe, cached.slice(-limit), 'binance_futures', 0)
  }

  const healthCheck = async (): Promise<HealthCheckResult> => {
    try {
      const t0 = Date.now()
      const res = await fetch(`${REST_BASE}/fapi/v1/ping`)
      return { ok: res.ok, latencyMs: Date.now() - t0 }
    } catch (err) {
      return { ok: false, latencyMs: 0, error: err instanceof Error ? err.message : 'Unknown' }
    }
  }

  return {
    id: 'binance_futures',
    name: 'Binance Futures',
    status: 'active',
    markets: ['crypto_perp'] as AssetClass[],
    connect,
    disconnect,
    getSnapshot,
    getCandles,
    healthCheck,
  }
}
