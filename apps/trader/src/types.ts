// ─── TRADER BOT TYPES ───────────────────────────────────────
// Defines the interfaces for signal consumption, order management,
// and Freqtrade strategy bridging.

import type { SignalType, SignalDirection } from '@/types'

// ─── TRADE SIGNAL (from Analyst) ───────────────────────────

export interface TradeSignal {
  id: string
  instrumentId: string
  signalType: SignalType
  direction: SignalDirection
  strength: number            // 0–1
  price: number
  timestamp: string
  source: 'analyst'
}

// ─── ORDER ─────────────────────────────────────────────────

export type OrderSide = 'buy' | 'sell'
export type OrderType = 'market' | 'limit' | 'stop_limit'
export type OrderStatus = 'pending' | 'submitted' | 'filled' | 'partial' | 'cancelled' | 'rejected'

export interface Order {
  id: string
  instrumentId: string
  side: OrderSide
  type: OrderType
  quantity: number
  price: number | null          // null for market orders
  stopPrice: number | null      // for stop_limit
  status: OrderStatus
  signalId: string              // back-reference to TradeSignal
  vetoDecisionId: string | null // back-reference to Sentinel veto
  createdAt: string
  filledAt: string | null
  filledPrice: number | null
  filledQuantity: number | null
}

// ─── POSITION ──────────────────────────────────────────────

export type PositionSide = 'long' | 'short'

export interface Position {
  id: string
  instrumentId: string
  side: PositionSide
  entryPrice: number
  currentPrice: number
  quantity: number
  unrealizedPnl: number
  unrealizedPnlPct: number
  stopLoss: number | null
  takeProfit: number | null
  openedAt: string
  orderId: string
}

// ─── FREQTRADE BRIDGE ──────────────────────────────────────

export interface FreqtradeConfig {
  apiUrl: string                // e.g. http://localhost:8080
  apiToken: string
  dryRun: boolean               // paper trading mode
  maxOpenTrades: number
  stakeAmount: number           // per-trade size in quote currency
  stakeCurrency: string         // e.g. 'USDT'
}

export interface FreqtradeStatus {
  connected: boolean
  version: string | null
  botState: 'running' | 'stopped' | 'reload_config' | null
  openTradeCount: number
  totalProfit: number
  lastUpdate: string | null
}

// ─── PIPELINE ──────────────────────────────────────────────

export type PipelineStage = 'received' | 'filtered' | 'vetoed' | 'approved' | 'submitted' | 'executed' | 'rejected'

export interface PipelineEvent {
  timestamp: string
  signalId: string
  stage: PipelineStage
  detail: string
}
