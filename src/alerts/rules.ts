import type { AlertRule } from '@/types'

let _ruleSeq = 0
const ruleId = (): string => `alert_${++_ruleSeq}`

export const createRule = (
  partial: Omit<AlertRule, 'id' | 'triggered' | 'triggeredAt'> & { id?: string },
): AlertRule => ({
  id: partial.id ?? ruleId(),
  instrumentId: partial.instrumentId,
  type: partial.type,
  value: partial.value,
  active: partial.active,
  severity: partial.severity,
  triggered: false,
  triggeredAt: null,
})

export const DEFAULT_RULES: AlertRule[] = [
  createRule({ instrumentId: 'BTC-USD-SPOT', type: 'rsi_overbought', value: 70, active: true, severity: 'warning' }),
  createRule({ instrumentId: 'BTC-USD-SPOT', type: 'rsi_oversold',   value: 30, active: true, severity: 'warning' }),
  createRule({ instrumentId: 'BTC-USD-SPOT', type: 'bb_squeeze',     value: 0.02, active: true, severity: 'info' }),
  createRule({ instrumentId: 'ETH-USD-SPOT', type: 'rsi_overbought', value: 70, active: true, severity: 'warning' }),
  createRule({ instrumentId: 'ETH-USD-SPOT', type: 'rsi_oversold',   value: 30, active: true, severity: 'warning' }),
  createRule({ instrumentId: 'BTC-PERP',     type: 'funding_extreme', value: 0.0003, active: true, severity: 'critical' }),
  createRule({ instrumentId: 'ETH-PERP',     type: 'funding_extreme', value: 0.0003, active: true, severity: 'critical' }),
]
