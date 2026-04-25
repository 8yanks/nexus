import type { DataStatus } from './quality'

export type SignalType =
  | 'RSI_OVERSOLD'
  | 'RSI_OVERBOUGHT'
  | 'BB_SQUEEZE'
  | 'BB_BREAKOUT_UP'
  | 'BB_BREAKOUT_DOWN'
  | 'DC_BREAKOUT_UP'
  | 'DC_BREAKOUT_DOWN'
  | 'DC_MID_CROSS_UP'
  | 'DC_MID_CROSS_DOWN'
  | 'HIGH_VOLUME'
  | 'EMA_CROSS_BULL'
  | 'EMA_CROSS_BEAR'
  | 'STRUCT_BULL'
  | 'STRUCT_BEAR'

export type SignalDirection = 'bullish' | 'bearish' | 'neutral'

export interface SignalEvent {
  id: string
  instrumentId: string
  type: SignalType
  direction: SignalDirection
  strength: number       // 0–1
  description: string
  price: number
  timestamp: string
  _source: string
  _status: DataStatus
}
