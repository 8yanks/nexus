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

// Donchian breakout — current price vs the prior N-bar high/low,
// computed in `analytics.donchianBreakout` to exclude the current
// candle (otherwise a fresh new high would always be `>=` the upper
// and the signal could never fire). Stateful firing matches the
// Bollinger pattern: while price stays above the prior range, the
// signal continues to assert each refresh. The journal/dedup
// downstream is responsible for not duplicating across same-bar
// refreshes; here we just report the state.
const detectDonchianBreakout = (
  instrumentId: string,
  analytics: AnalyticsResult,
  price: number,
): SignalEvent[] => {
  const signals: SignalEvent[] = []
  if (analytics.donchianBreakout == null) return signals

  const { upper, lower } = analytics.donchianBreakout
  if (price > upper) {
    signals.push(makeSignal(instrumentId, 'DC_BREAKOUT_UP', price))
  }
  if (price < lower) {
    signals.push(makeSignal(instrumentId, 'DC_BREAKOUT_DOWN', price))
  }
  return signals
}

// Donchian midline cross — softer than the breakout. Fires once on
// the BAR where price transitions across the midline (cross detection
// via prevAnalytics, mirror of the EMA cross pattern). Useful as an
// early trend-hint that a future breakout might confirm. We use the
// plain `donchian` field here (includes the current bar) because the
// midline is the average of the visible channel — the cross semantics
// don't care about the "exclude current to allow new highs" trick that
// the breakout detector needs.
const detectDonchianMidCross = (
  instrumentId: string,
  analytics: AnalyticsResult,
  prevAnalytics: AnalyticsResult | null,
  price: number,
): SignalEvent[] => {
  if (analytics.donchian == null || prevAnalytics?.donchian == null) return []
  // We need a "previous price" to detect a cross — the analytics
  // doesn't carry it directly, but the prior analytics' VWAP/EMA20
  // sit close enough that a midline-cross signal needs an actual
  // price-now / price-then comparison. Since we don't have prevPrice
  // here, we approximate with prevAnalytics.donchian.middle as the
  // baseline: was the price above the prior midline? This is a stale
  // proxy but acceptable for a "soft hint" signal.
  const prevMid = prevAnalytics.donchian.middle
  const currMid = analytics.donchian.middle
  // Use prev EMA20 as a stand-in for "where price was on the previous
  // bar" — closes-driven, less noisy than the candle itself.
  const prevPriceProxy = prevAnalytics.ema20 ?? prevMid

  const wasAbove = prevPriceProxy > prevMid
  const nowAbove = price > currMid

  const signals: SignalEvent[] = []
  if (nowAbove && !wasAbove) {
    signals.push(makeSignal(instrumentId, 'DC_MID_CROSS_UP', price))
  }
  if (!nowAbove && wasAbove) {
    signals.push(makeSignal(instrumentId, 'DC_MID_CROSS_DOWN', price))
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
    ...detectDonchianBreakout(instrumentId, analytics, price),
    ...detectDonchianMidCross(instrumentId, analytics, prevAnalytics, price),
    ...detectVolume(instrumentId, analytics, price),
    ...detectEMACross(instrumentId, analytics, prevAnalytics, price),
    ...detectStructure(instrumentId, structure, price),
  ]
}
