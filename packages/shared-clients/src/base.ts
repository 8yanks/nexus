import type {
  AssetClass,
  MarketSnapshot,
  CandleSeries,
  OrderBookSnapshot,
  FundingSnapshot,
} from '@/types'

export type ProviderStatus = 'active' | 'mock' | 'error' | 'disconnected'

export interface HealthCheckResult {
  ok: boolean
  latencyMs: number
  error?: string
}

export interface BaseProvider {
  id: string
  name: string
  status: ProviderStatus
  markets: AssetClass[]

  connect(): Promise<void>
  disconnect(): Promise<void>

  getSnapshot(instrumentId: string): Promise<MarketSnapshot>
  getCandles(instrumentId: string, timeframe: string, limit: number): Promise<CandleSeries>
  getOrderBook?(instrumentId: string, depth: number): Promise<OrderBookSnapshot>
  getFunding?(instrumentId: string): Promise<FundingSnapshot>

  healthCheck(): Promise<HealthCheckResult>
}
