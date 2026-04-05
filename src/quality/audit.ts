import type { DataQualityReport } from '@/types'

// ─── CONTINUOUS QUALITY AUDIT ───────────────────────────────
// Maintains a rolling log of quality snapshots over time.
// Useful for tracking data quality trends.

export interface AuditEntry {
  timestamp: string
  instrumentId: string
  overallScore: number
  issues: string[]
}

const MAX_AUDIT_ENTRIES = 1000

let _log: AuditEntry[] = []

export const recordAudit = (report: DataQualityReport): void => {
  _log.push({
    timestamp: report.assessedAt,
    instrumentId: report.instrumentId,
    overallScore: report.overallScore,
    issues: report.issues,
  })
  if (_log.length > MAX_AUDIT_ENTRIES) {
    _log = _log.slice(-MAX_AUDIT_ENTRIES)
  }
}

export const recordAllAudits = (
  reports: Record<string, DataQualityReport>,
): void => {
  for (const report of Object.values(reports)) {
    recordAudit(report)
  }
}

export const getAuditLog = (): ReadonlyArray<AuditEntry> => _log

export const getAuditForInstrument = (
  instrumentId: string,
): ReadonlyArray<AuditEntry> =>
  _log.filter((e) => e.instrumentId === instrumentId)

export const clearAuditLog = (): void => {
  _log = []
}
