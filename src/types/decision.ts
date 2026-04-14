import type { DataStatus } from './quality'

export type DecisionAction = 'BUY' | 'SELL' | 'HOLD'
export type DecisionRisk = 'low' | 'medium' | 'high' | 'extreme'
export type DecisionHorizon = 'scalp' | 'intraday' | 'swing' | 'position'

export interface TradeDecision {
  id: string
  timestamp: number
  instrumentId: string
  symbol: string

  action: DecisionAction
  size: number
  entryPrice: number | null
  stopLoss: number | null
  takeProfit: number | null

  confidence: number
  riskLevel: DecisionRisk
  horizon: DecisionHorizon

  thesis: string
  keyFactors: string[]
  invalidators: string[]

  requiresHumanReview: boolean
  modelSource: string
  consensusScore: number | null

  _source: string
  _status: DataStatus
  _contextHash: string
}

export type VetoReason =
  | 'DATA_TOO_OLD'
  | 'DATA_QUALITY_LOW'
  | 'LATENCY_TOO_HIGH'
  | 'DRAWDOWN_EXCEEDED'
  | 'EXPOSURE_EXCEEDED'
  | 'SIZE_TOO_LARGE'
  | 'MODEL_RESPONSE_INVALID'
  | 'MODEL_CONSENSUS_LOW'
  | 'BROKER_UNAVAILABLE'
  | 'SAFE_MODE_ACTIVE'
  | 'MANUAL_BLOCK'

export interface SentinelVeto {
  id: string
  timestamp: number
  decisionId: string
  approved: boolean
  vetoReasons: VetoReason[]
  riskMetrics: {
    currentDrawdown: number
    maxDrawdownLimit: number
    currentExposure: number
    maxExposureLimit: number
    dataQualityScore: number
    minDataQuality: number
    latencyMs: number
    maxLatencyMs: number
    brokerAvailable: boolean
  }
  safeMode: boolean
  _source: 'sentinel_engine'
}
