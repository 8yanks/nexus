export type AuditModule = 'analyst' | 'sentinel' | 'trader' | 'broker' | 'ai' | 'system'

export type AuditEventType =
  | 'DATA_RECEIVED'
  | 'SIGNAL_DETECTED'
  | 'CONTEXT_BUILT'
  | 'AI_PROMPT_SENT'
  | 'AI_RESPONSE_RAW'
  | 'AI_RESPONSE_VALIDATED'
  | 'AI_RESPONSE_REJECTED'
  | 'DECISION_CREATED'
  | 'SENTINEL_CHECK'
  | 'SENTINEL_APPROVED'
  | 'SENTINEL_VETOED'
  | 'SAFE_MODE_ACTIVATED'
  | 'SAFE_MODE_DEACTIVATED'
  | 'PRE_TRADE_CHECK'
  | 'ORDER_SUBMITTED'
  | 'ORDER_FILLED'
  | 'ORDER_REJECTED'
  | 'POSITION_OPENED'
  | 'POSITION_CLOSED'
  | 'PNL_UPDATED'
  | 'REVIEW_TRIGGERED'
  | 'REVIEW_COMPLETED'
  | 'SYSTEM_ERROR'

export interface AuditEntry {
  id: string
  timestamp: number
  eventType: AuditEventType
  module: AuditModule
  summary: string
  data: Record<string, unknown>
  _source: string
}
