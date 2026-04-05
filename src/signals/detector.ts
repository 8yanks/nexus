import type { SignalEvent, SignalType, DataStatus } from '@/types'
import type { AnalyticsResult } from '@/analytics/indicators'
import type { StructureResult } from '@/analytics/structure'
import { SIGNAL_CONFIGS, SIGNAL_THRESHOLDS } from './types'

// ─── HELPERS ────────────────────────────────────────────────

let _seqId = 0
const genId = (): string => `sig_${Date.now()}_${++_seqId}`

const makeSignal = (
  instrumentId: string,
  type: SignalType,
  price: number,
  strength?: number,
): SignalEvent => {
  const config = SIGNAL_CONFIGS[type]
  return {
    id: genId(),
    instrumentId,
    type,
    direction: config.direction,
    strength: strength ?? config.defaultStrength,
    description: config.description,
    price,
    timestamp: new Date().toISOString(),
    _source: 'signal_detector',
    _status: 'SIMULATED' as DataStatus,
  }
}

// ─── INDIVIDUAL DETECTORS ───────────────────────────────────

const detectRSI = (
  instrumentId: string,
  analytics: AnalyticsResult,
  price: number,
): SignalEvent[] => {
  const signals: SignalEvent[] = []
  if (analytics.rsi == null) return signals

  if (analytics.rsi < SIGNAL_THRESHOLDS.RSI_OVERSOLD) {
    const strength = Math.min(1, 0.5 + (SIGNAL_THRESHOLDS.RSI_OVERSOLD - analytics.rsi) / 60)
    signals.push(makeSignal(instrumentId, 'RSI_OVERSOLD', price, strength))
  }
  if (analytics.rsi > SIGNAL_THRESHOLDS.RSI_OVERBOUGHT) {
    const strength = Math.min(1, 0.5 + (analytics.rsi - SIGNAL_THRESHOLDS.RSI_OVERBOUGHT) / 60)
    signals.push(makeSignal(instrumentId, 'RSI_OVERBOUGHT', price, strength))
  }
  return signals
}

const detectBollinger = (
  instrumentId: string,
  analytics: AnalyticsResult,
  price: number,
): SignalEvent[] => {
  const signals: SignalEvent[] = []
  if (analytics.bollinger == null) return signals

  const { bandwidth, upper, lower } = analytics.bollinger

  if (bandwidth < SIGNAL_THRESHOLDS.BB_SQUEEZE_WIDTH) {
    signals.push(makeSignal(instrumentId, 'BB_SQUEEZE', price))
  }
  if (price > upper) {
    signals.push(makeSignal(instrumentId, 'BB_BREAKOUT_UP', price))
  }
  if (price < lower) {
    signals.push(makeSignal(instrumentId, 'BB_BREAKOUT_DOWN', price))
  }
  return signals
}

const detectVolume = (
  instrumentId: string,
  analytics: AnalyticsResult,
  price: number,
): SignalEvent[] => {
  if (analytics.relativeVolume == null) return []
  if (analytics.relativeVolume > SIGNAL_THRESHOLDS.HIGH_VOLUME_RATIO) {
    return [makeSignal(instrumentId, 'HIGH_VOLUME', price)]
  }
  return []
}

const detectEMACross = (
  instrumentId: string,
  analytics: AnalyticsResult,
  prevAnalytics: AnalyticsResult | null,
  price: number,
): SignalEvent[] => {
  if (
    analytics.ema20 == null ||
    analytics.ema50 == null ||
    prevAnalytics?.ema20 == null ||
    prevAnalytics?.ema50 == null
  ) {
    return []
  }

  const signals: SignalEvent[] = []
  const nowAbove = analytics.ema20 > analytics.ema50
  const wasAbove = prevAnalytics.ema20 > prevAnalytics.ema50

  if (nowAbove && !wasAbove) {
    signals.push(makeSignal(instrumentId, 'EMA_CROSS_BULL', price))
  }
  if (!nowAbove && wasAbove) {
    signals.push(makeSignal(instrumentId, 'EMA_CROSS_BEAR', price))
  }
  return signals
}

const detectStructure = (
  instrumentId: string,
  structure: StructureResult | null,
  price: number,
): SignalEvent[] => {
  if (structure == null) return []
  if (structure.trend === 'bullish') {
    return [makeSignal(instrumentId, 'STRUCT_BULL', price)]
  }
  if (structure.trend === 'bearish') {
    return [makeSignal(instrumentId, 'STRUCT_BEAR', price)]
  }
  return []
}

// ─── MAIN DETECTOR ──────────────────────────────────────────

export const detectSignals = (
  instrumentId: string,
  price: number,
  analytics: AnalyticsResult,
  structure: StructureResult | null,
  prevAnalytics: AnalyticsResult | null,
): SignalEvent[] => {
  return [
    ...detectRSI(instrumentId, analytics, price),
    ...detectBollinger(instrumentId, analytics, price),
    ...detectVolume(instrumentId, analytics, price),
    ...detectEMACross(instrumentId, analytics, prevAnalytics, price),
    ...detectStructure(instrumentId, structure, price),
  ]
}
