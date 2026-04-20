import type { AssetClass, MarketSnapshot, CandleSeries, OHLCV } from '@/types'
import type { BaseProvider, HealthCheckResult } from '../base'
import type {
  KrakenTickerResponse,
  KrakenOHLCResponse,
  KrakenOHLCRow,
} from './types'
import {
  getKrakenInstrumentIds,
  toKrakenPair,
} from '@/normalization/instrument'
import { normalizeSpotTicker } from '@/normalization/snapshot'
import { buildCandleSeries } from '@/normalization/candle'

// ─── KRAKEN SPOT PROVIDER ───────────────────────────────────
// REST-only third crypto source. No WebSocket — Binance + Coinbase
// already cover the live push side; Kraken's role is cross-source
// validation + a genuine third fallback if both others break.
//
// Rate limits for anonymous public endpoints are ~1 call / sec per
// IP (undocumented but observed). We poll on refreshAll, which runs
// every 5s, so we're well under.

const REST_BASE = 'https://api.kraken.com/0/public'
const OHLC_INTERVAL_MIN = 60   // 60-minute candles = 1h, matches other providers

// ─── INTERNAL STATE ─────────────────────────────────────────

interface SpotState {
  snapshots: Map<string, MarketSnapshot>
  candles: Map<string, OHLCV[]>
}

// ─── REST HELPERS ───────────────────────────────────────────

const fetchTicker = async (pair: string): Promise<KrakenTickerResponse> => {
  const res = await fetch(`${REST_BASE}/Ticker?pair=${encodeURIComponent(pair)}`)
  if (!res.ok) throw new Error(`Kraken ticker HTTP ${res.status}`)
  const json = (await res.json()) as KrakenTickerResponse
  if (json.error?.length) throw new Error(`Kraken ticker error: ${json.error.join(', ')}`)
  return json
}

const fetchOHLC = async (pair: string, intervalMin: number): Promise<KrakenOHLCResponse> => {
  const res = await fetch(
    `${REST_BASE}/OHLC?pair=${encodeURIComponent(pair)}&interval=${intervalMin}`,
  )
  if (!res.ok) throw new Error(`Kraken OHLC HTTP ${res.status}`)
  const json = (await res.json()) as KrakenOHLCResponse
  if (json.error?.length) throw new Error(`Kraken OHLC error: ${json.error.join(', ')}`)
  return json
}

// Kraken wraps the result in a single key that may differ from the
// requested pair (`XBTUSD` → `XXBTZUSD`). We don't care which key it
// is — take whatever the response holds, skipping the `last` cursor.
const firstPairValue = <T>(result: Record<string, T | number>): T | null => {
  for (const [k, v] of Object.entries(result)) {
    if (k === 'last') continue
    return v as T
  }
  return null
}

const normalizeKrakenCandle = (row: KrakenOHLCRow): OHLCV => ({
  open: Number(row[1]),
  high: Number(row[2]),
  low: Number(row[3]),
  close: Number(row[4]),
  volume: Number(row[6]),
  timestamp: new Date(row[0] * 1000).toISOString(),
  _source: 'kraken',
  _status: 'LIVE',
})

// ─── PROVIDER FACTORY ───────────────────────────────────────

export const createKrakenSpotProvider = (): BaseProvider => {
  const state: SpotState = {
    snapshots: new Map(),
    candles: new Map(),
  }

  const instrumentIds = getKrakenInstrumentIds()

  // Fetch fresh data for one instrument. Called once at connect()
  // (warm-up) and then on every getSnapshot — Kraken has no push
  // channel, so "snapshot" == "most recent REST poll".
  const refresh = async (instrumentId: string): Promise<void> => {
    const pair = toKrakenPair(instrumentId)
    if (!pair) return

    const t0 = Date.now()
    const [tickerRes, ohlcRes] = await Promise.all([
      fetchTicker(pair),
      fetchOHLC(pair, OHLC_INTERVAL_MIN),
    ])
    const latencyMs = Date.now() - t0

    const ticker = firstPairValue(tickerRes.result)
    if (!ticker) throw new Error(`Kraken: empty ticker for ${pair}`)

    const rows = firstPairValue(ohlcRes.result) as KrakenOHLCRow[] | null
    const candles = (rows ?? []).map(normalizeKrakenCandle)

    // 24h rolling open from candles (candle 24 rows back) — strictly
    // more accurate than Kraken's `o` which is "today's 00:00 UTC
    // open", not 24h rolling.
    const price = Number(ticker.c[0])
    const open24h = candles.length >= 24
      ? candles[candles.length - 24].open
      : Number(ticker.o)
    const change24h = price - open24h
    const change24hPct = open24h > 0 ? (change24h / open24h) * 100 : 0

    const snapshot = normalizeSpotTicker({
      instrumentId,
      price,
      bid: Number(ticker.b[0]),
      ask: Number(ticker.a[0]),
      high24h: Number(ticker.h[1]),
      low24h: Number(ticker.l[1]),
      volume24h: Number(ticker.v[1]),
      change24h,
      change24hPct,
      latencyMs,
    })

    // Override the binance_spot provenance baked in by normalizeSpotTicker.
    const krakenSnapshot: MarketSnapshot = {
      ...snapshot,
      vwap: Number(ticker.p[1]),
      _source: 'kraken',
      _provenance: {
        ...snapshot._provenance,
        source: 'kraken',
        fetchMethod: 'rest',
      },
    }

    state.snapshots.set(instrumentId, krakenSnapshot)
    state.candles.set(instrumentId, candles)
  }

  const connect = async (): Promise<void> => {
    // Warm-up — in parallel. Any failure is logged and swallowed so
    // one bad pair doesn't abort the others.
    await Promise.all(
      instrumentIds.map((id) =>
        refresh(id).catch((err) => {
          console.error(`[Kraken] Failed to init ${id}:`, err)
        }),
      ),
    )
  }

  const disconnect = async (): Promise<void> => {
    state.snapshots.clear()
    state.candles.clear()
  }

  const getSnapshot = async (instrumentId: string): Promise<MarketSnapshot> => {
    // Refresh on demand — no WS, so this IS the live path. The store
    // calls getSnapshot every 5s; Kraken's 1-req/sec soft-limit covers
    // our 3 instruments comfortably.
    try {
      await refresh(instrumentId)
    } catch (err) {
      // Fall through to whatever we had cached.
      console.warn(`[Kraken] refresh failed for ${instrumentId}:`, err)
    }
    const cached = state.snapshots.get(instrumentId)
    if (cached) return cached
    throw new Error(`No Kraken snapshot for ${instrumentId}`)
  }

  const getCandles = async (
    instrumentId: string,
    timeframe: string,
    limit: number,
  ): Promise<CandleSeries> => {
    const cached = state.candles.get(instrumentId) ?? []
    const sliced = cached.slice(-limit)
    return buildCandleSeries(instrumentId, timeframe, sliced, 'kraken', 0)
  }

  const healthCheck = async (): Promise<HealthCheckResult> => {
    try {
      const t0 = Date.now()
      const res = await fetch(`${REST_BASE}/Time`)
      const latencyMs = Date.now() - t0
      return { ok: res.ok, latencyMs }
    } catch (err) {
      return {
        ok: false,
        latencyMs: 0,
        error: err instanceof Error ? err.message : 'Unknown',
      }
    }
  }

  return {
    id: 'kraken',
    name: 'Kraken',
    status: 'active',
    markets: ['crypto_spot'] as AssetClass[],
    connect,
    disconnect,
    getSnapshot,
    getCandles,
    healthCheck,
  }
}
