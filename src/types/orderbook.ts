import type { DataStatus, DataProvenance } from './quality'

export interface OrderBookLevel {
  price: number
  size: number
}

export interface OrderBookSnapshot {
  instrumentId: string
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
  timestamp: string
  _source: string
  _status: DataStatus
  _provenance: DataProvenance
}
