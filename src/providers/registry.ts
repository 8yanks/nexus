import type { AssetClass, MarketSnapshot, CandleSeries } from '@/types'
import type { BaseProvider, HealthCheckResult, ProviderStatus } from './base'
import { INSTRUMENTS, INSTRUMENT_MAP } from './mock/instruments'
import { generateSnapshot, generateCandles } from './mock/generator'
import { createBinanceSpotProvider } from './binance/spot'
import { createBinanceFuturesProvider } from './binance/futures'
import { createCoinbaseSpotProvider } from './coinbase/spot'
import { createKrakenSpotProvider } from './kraken/spot'

// ─── PROVIDER DEFINITION (static metadata) ───────────────────

export interface ProviderDef {
  id: string
  name: string
  type: string
  status: ProviderStatus
  supports: AssetClass[]
  endpoint: string
  rateLimit: string
  note?: string
}

export const PROVIDER_DEFS: ProviderDef[] = [
  { id: 'binance',  name: 'Binance',      type: 'crypto',    status: 'active',       supports: ['crypto_spot', 'crypto_perp'], endpoint: 'wss://stream.binance.com',                  rateLimit: '1200/min' },
  { id: 'coinbase', name: 'Coinbase',     type: 'crypto',    status: 'active',       supports: ['crypto_spot'],                endpoint: 'wss://ws-feed.exchange.coinbase.com',        rateLimit: '10/sec' },
  { id: 'kraken',   name: 'Kraken',       type: 'crypto',    status: 'active',       supports: ['crypto_spot'],                endpoint: 'https://api.kraken.com/0/public',            rateLimit: '1/sec' },
  { id: 'alpaca',   name: 'Alpaca',       type: 'equities',  status: 'disconnected', supports: ['us_equity'],                  endpoint: 'wss://stream.data.alpaca.markets',           rateLimit: '200/min' },
  { id: 'polygon',  name: 'Polygon.io',   type: 'multi',     status: 'disconnected', supports: ['us_equity', 'forex', 'crypto_spot'], endpoint: 'wss://socket.polygon.io',            rateLimit: 'unlimited' },
  { id: 'oanda',    name: 'OANDA',        type: 'forex',     status: 'disconnected', supports: ['forex'],                      endpoint: 'wss://stream-fxpractice.oanda.com',          rateLimit: '120/sec' },
  { id: 'fred',     name: 'FRED',         type: 'macro',     status: 'disconnected', supports: [],                             endpoint: 'https://api.stlouisfed.org',                 rateLimit: '120/min' },
  { id: 'mock',     name: 'Mock Provider',type: 'all',       status: 'mock',         supports: ['crypto_spot', 'crypto_perp', 'us_equity', 'forex', 'index', 'commodity'], endpoint: 'internal://mock', rateLimit: 'unlimited', note: 'Simulated data only — not real market data' },
]

// ─── MOCK PROVIDER IMPLEMENTATION ───────────────────────────

const createMockProvider = (): BaseProvider => ({
  id: 'mock',
  name: 'Mock Provider',
  status: 'mock',
  markets: ['crypto_spot', 'crypto_perp', 'us_equity', 'forex', 'index', 'commodity'],

  connect: () => Promise.resolve(),
  disconnect: () => Promise.resolve(),

  getSnapshot: (instrumentId: string): Promise<MarketSnapshot> => {
    const inst = INSTRUMENT_MAP[instrumentId]
    if (!inst) return Promise.reject(new Error(`Unknown instrument: ${instrumentId}`))
    return Promise.resolve(generateSnapshot(inst))
  },

  getCandles: (instrumentId: string, timeframe: string, limit: number): Promise<CandleSeries> => {
    return Promise.resolve(generateCandles(instrumentId, timeframe, limit))
  },

  healthCheck: (): Promise<HealthCheckResult> => {
    return Promise.resolve({ ok: true, latencyMs: 0 })
  },
})

// ─── REGISTRY ────────────────────────────────────────────────

export type ProviderRegistry = Record<string, BaseProvider>

export const createRegistry = (): ProviderRegistry => ({
  mock: createMockProvider(),
  binance_spot: createBinanceSpotProvider(),
  binance_futures: createBinanceFuturesProvider(),
  coinbase: createCoinbaseSpotProvider(),
  kraken: createKrakenSpotProvider(),
})

export const runHealthChecks = async (
  registry: ProviderRegistry,
): Promise<Record<string, HealthCheckResult>> => {
  const results: Record<string, HealthCheckResult> = {}
  await Promise.all(
    Object.entries(registry).map(async ([id, provider]) => {
      try {
        results[id] = await provider.healthCheck()
      } catch (err) {
        results[id] = {
          ok: false,
          latencyMs: 0,
          error: err instanceof Error ? err.message : 'Unknown error',
        }
      }
    }),
  )
  return results
}

export { INSTRUMENTS }
