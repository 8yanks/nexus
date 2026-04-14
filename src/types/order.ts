import type { DataStatus } from './quality'

export type PaperOrderStatus = 'pending' | 'filled' | 'rejected' | 'cancelled'
export type PaperOrderSide = 'buy' | 'sell'
export type PaperOrderType = 'market' | 'limit'

export interface PaperOrder {
  id: string
  timestamp: number
  decisionId: string
  sentinelApprovalId: string
  instrumentId: string
  symbol: string
  side: PaperOrderSide
  type: PaperOrderType
  size: number
  price: number
  slippage: number
  status: PaperOrderStatus
  fillPrice: number | null
  fillTime: number | null
  pnl: number | null
  _source: 'paper_broker'
  _status: DataStatus
}
