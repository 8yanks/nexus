import type { DataStatus } from './quality'

export type SignalType =
  // Technical
  | 'RSI_OVERSOLD'
  | 'RSI_OVERBOUGHT'
  | 'BB_SQUEEZE'
  | 'BB_BREAKOUT_UP'
  | 'BB_BREAKOUT_DOWN'
  | 'HIGH_VOLUME'
  | 'EMA_CROSS_BULL'
  | 'EMA_CROSS_BEAR'
  | 'STRUCT_BULL'
  | 'STRUCT_BEAR'
  // Corporate
  | 'CORP_EARNINGS_SURPRISE'
  | 'CORP_GUIDANCE_CHANGE'
  | 'CORP_INSIDER_ACTIVITY'
  | 'CORP_MA_EVENT'
  | 'CORP_REGULATORY'
  // Macro
  | 'MACRO_RATE_CHANGE'
  | 'MACRO_INFLATION_SHIFT'
  | 'MACRO_SENTIMENT_SHIFT'

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
