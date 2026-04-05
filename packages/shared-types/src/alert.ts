export type AlertType =
  | 'price_above'
  | 'price_below'
  | 'funding_extreme'
  | 'rsi_overbought'
  | 'rsi_oversold'
  | 'volume_spike'
  | 'bb_squeeze'

export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface AlertRule {
  id: string
  instrumentId: string
  type: AlertType
  value: number
  active: boolean
  triggered: boolean
  severity: AlertSeverity
  triggeredAt: string | null
}
