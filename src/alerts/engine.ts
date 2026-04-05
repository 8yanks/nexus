import type { AlertRule, MarketSnapshot } from '@/types'
import type { AnalyticsResult } from '@/analytics/indicators'

export interface AlertEvaluation {
  rule: AlertRule
  triggered: boolean
  currentValue: number | null
}

const getValue = (
  rule: AlertRule,
  snap: MarketSnapshot,
  analytics: AnalyticsResult | null,
): number | null => {
  switch (rule.type) {
    case 'price_above':
    case 'price_below':
      return snap.price
    case 'funding_extreme':
      return snap.fundingRate
    case 'rsi_overbought':
    case 'rsi_oversold':
      return analytics?.rsi ?? null
    case 'volume_spike':
      return analytics?.relativeVolume ?? null
    case 'bb_squeeze':
      return analytics?.bollinger?.bandwidth ?? null
    default:
      return null
  }
}

const isTriggered = (rule: AlertRule, value: number | null): boolean => {
  if (value == null) return false
  switch (rule.type) {
    case 'price_above':
    case 'rsi_overbought':
      return value > rule.value
    case 'price_below':
    case 'rsi_oversold':
      return value < rule.value
    case 'funding_extreme':
      return Math.abs(value) > rule.value
    case 'volume_spike':
      return value > rule.value
    case 'bb_squeeze':
      return value < rule.value
    default:
      return false
  }
}

export const evaluateRule = (
  rule: AlertRule,
  snap: MarketSnapshot,
  analytics: AnalyticsResult | null,
): AlertEvaluation => {
  const currentValue = getValue(rule, snap, analytics)
  const triggered = rule.active && isTriggered(rule, currentValue)
  return { rule, triggered, currentValue }
}

export const evaluateAllRules = (
  rules: AlertRule[],
  snap: MarketSnapshot,
  analytics: AnalyticsResult | null,
): AlertEvaluation[] =>
  rules
    .filter((r) => r.instrumentId === snap.instrumentId)
    .map((r) => evaluateRule(r, snap, analytics))
