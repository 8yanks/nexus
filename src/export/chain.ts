// ─── CHAIN EXPORT ───────────────────────────────────────────
// Serialise the decision-chain artefacts (decisions, vetos, orders,
// positions, audit) to CSV / JSON for offline review and post-mortems.

import type { TradeDecision, SentinelVeto } from '@/types/decision'
import type { PaperOrder } from '@/types/order'
import type { Position } from '@/types/position'
import type { AuditEntry } from '@/types/audit'

const escapeCSV = (val: string): string => {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

const row = (values: (string | number | boolean | null | undefined)[]): string =>
  values.map((v) => (v == null ? '' : escapeCSV(String(v)))).join(',')

const isoOrEmpty = (t: number | null | undefined): string =>
  t == null ? '' : new Date(t).toISOString()

// ─── CSV ────────────────────────────────────────────────────

export const decisionsToCSV = (decisions: TradeDecision[]): string => {
  const header = row([
    'id', 'timestamp_iso', 'instrument_id', 'symbol',
    'action', 'size', 'entry_price', 'stop_loss', 'take_profit',
    'confidence', 'risk_level', 'horizon',
    'requires_human_review', 'model_source', 'consensus_score',
    'thesis', 'context_hash',
  ])
  const rows = decisions.map((d) =>
    row([
      d.id, isoOrEmpty(d.timestamp), d.instrumentId, d.symbol,
      d.action, d.size, d.entryPrice, d.stopLoss, d.takeProfit,
      d.confidence, d.riskLevel, d.horizon,
      d.requiresHumanReview, d.modelSource, d.consensusScore,
      d.thesis, d._contextHash,
    ]),
  )
  return [header, ...rows].join('\n')
}

export const vetosToCSV = (vetos: SentinelVeto[]): string => {
  const header = row([
    'id', 'timestamp_iso', 'decision_id', 'approved',
    'reasons', 'safe_mode',
    'current_drawdown', 'max_drawdown_limit',
    'current_exposure', 'max_exposure_limit',
    'data_quality_score', 'min_data_quality',
    'latency_ms', 'max_latency_ms',
    'broker_available',
  ])
  const rows = vetos.map((v) =>
    row([
      v.id, isoOrEmpty(v.timestamp), v.decisionId, v.approved,
      v.vetoReasons.join('|'), v.safeMode,
      v.riskMetrics.currentDrawdown, v.riskMetrics.maxDrawdownLimit,
      v.riskMetrics.currentExposure, v.riskMetrics.maxExposureLimit,
      v.riskMetrics.dataQualityScore, v.riskMetrics.minDataQuality,
      v.riskMetrics.latencyMs, v.riskMetrics.maxLatencyMs,
      v.riskMetrics.brokerAvailable,
    ]),
  )
  return [header, ...rows].join('\n')
}

export const ordersToCSV = (orders: PaperOrder[]): string => {
  const header = row([
    'id', 'timestamp_iso', 'decision_id', 'sentinel_approval_id',
    'instrument_id', 'symbol', 'side', 'size',
    'request_price', 'fill_price', 'slippage_bps', 'status',
  ])
  const rows = orders.map((o) =>
    row([
      o.id, isoOrEmpty(o.timestamp), o.decisionId, o.sentinelApprovalId,
      o.instrumentId, o.symbol, o.side, o.size,
      o.requestPrice, o.fillPrice, o.slippageBps, o.status,
    ]),
  )
  return [header, ...rows].join('\n')
}

export const positionsToCSV = (positions: Position[]): string => {
  const header = row([
    'id', 'opened_iso', 'closed_iso', 'instrument_id', 'symbol',
    'side', 'size', 'entry_price', 'mark_price',
    'stop_loss', 'take_profit', 'unrealized_pnl', 'realized_pnl',
    'status', 'close_reason',
  ])
  const rows = positions.map((p) =>
    row([
      p.id, isoOrEmpty(p.openedAt), isoOrEmpty(p.closedAt),
      p.instrumentId, p.symbol,
      p.side, p.size, p.entryPrice, p.markPrice,
      p.stopLoss, p.takeProfit, p.unrealizedPnl, p.realizedPnl,
      p.status, p.closeReason,
    ]),
  )
  return [header, ...rows].join('\n')
}

export const auditToCSV = (entries: AuditEntry[]): string => {
  const header = row(['id', 'timestamp_iso', 'module', 'event_type', 'summary'])
  const rows = entries.map((e) =>
    row([e.id, isoOrEmpty(e.timestamp), e.module, e.eventType, e.summary]),
  )
  return [header, ...rows].join('\n')
}

// ─── JSON ───────────────────────────────────────────────────

export interface ChainExportPayload {
  exportedAt: string
  counts: {
    decisions: number
    vetos: number
    orders: number
    positions: number
    audit: number
  }
  decisions: TradeDecision[]
  vetos: SentinelVeto[]
  orders: PaperOrder[]
  positions: Position[]
  audit: AuditEntry[]
  _meta: { version: string; source: string }
}

export const buildChainPayload = (
  decisions: TradeDecision[],
  vetos: SentinelVeto[],
  orders: PaperOrder[],
  positions: Position[],
  audit: AuditEntry[],
): ChainExportPayload => ({
  exportedAt: new Date().toISOString(),
  counts: {
    decisions: decisions.length,
    vetos: vetos.length,
    orders: orders.length,
    positions: positions.length,
    audit: audit.length,
  },
  decisions,
  vetos,
  orders,
  positions,
  audit,
  _meta: { version: '1.0.0', source: 'nexus_decision_chain' },
})

// ─── DOWNLOAD ───────────────────────────────────────────────

export const downloadText = (
  filename: string,
  content: string,
  mime = 'text/csv;charset=utf-8;',
): void => {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
