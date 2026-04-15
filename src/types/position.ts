import type { DataStatus } from './quality'

export type PositionSide = 'long' | 'short'
export type PositionStatus = 'open' | 'closed'
export type PositionCloseReason =
  | 'stop_loss'
  | 'take_profit'
  | 'manual'
  | 'session_end'

export interface Position {
  id: string
  orderId: string
  decisionId: string
  instrumentId: string
  symbol: string
  side: PositionSide
  size: number
  entryPrice: number
  stopLoss: number | null
  takeProfit: number | null

  openedAt: number
  closedAt: number | null

  markPrice: number
  unrealizedPnl: number
  unrealizedPnlPct: number

  realizedPnl: number | null
  closeReason: PositionCloseReason | null

  status: PositionStatus
  _source: 'paper_broker'
  _status: DataStatus
}
