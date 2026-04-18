// ─── AUDIT FILTER HELPERS ───────────────────────────────────
// Pure filter logic for the ChainMonitor audit panel. Kept outside the
// component so the matching rules are unit-testable without JSDOM.

import type { AuditEntry, AuditModule } from '@/types/audit'

export interface AuditFilter {
  /** Restrict to a single module, or 'all' to pass through. */
  module: AuditModule | 'all'
  /** Case-insensitive substring against eventType + summary. Empty = no filter. */
  query: string
  /** When set, restrict to entries whose `data.decisionId` matches exactly.
   *  Used by the drilldown's "jump to audit" link. Cleared independently
   *  of the text query so the user can layer or remove either filter. */
  decisionId?: string
}

export const EMPTY_FILTER: AuditFilter = { module: 'all', query: '' }

/**
 * Filters audit entries by module and by a substring match against eventType
 * or summary (case-insensitive). The entries array is NOT mutated.
 */
export const filterAuditEntries = (
  entries: AuditEntry[],
  filter: AuditFilter,
): AuditEntry[] => {
  const q = filter.query.trim().toLowerCase()
  const hasQuery = q.length > 0
  const moduleFilter = filter.module
  const decisionId = filter.decisionId

  if (!hasQuery && moduleFilter === 'all' && !decisionId) return entries

  return entries.filter((e) => {
    if (moduleFilter !== 'all' && e.module !== moduleFilter) return false
    if (decisionId) {
      const d = e.data as { decisionId?: unknown } | null | undefined
      if (!d || d.decisionId !== decisionId) return false
    }
    if (!hasQuery) return true
    return (
      e.eventType.toLowerCase().includes(q) ||
      e.summary.toLowerCase().includes(q)
    )
  })
}

/** All modules present in the entry set, sorted alphabetically. */
export const uniqueModules = (entries: AuditEntry[]): AuditModule[] => {
  const set = new Set<AuditModule>()
  for (const e of entries) set.add(e.module)
  return Array.from(set).sort()
}

// ─── PERSISTENCE ─────────────────────────────────────────────
// localStorage round-trip for the audit filter so it survives reloads.
// Storage failures (no window, JSON parse error, security exceptions
// in private mode) all fall through to EMPTY_FILTER — the filter is
// cosmetic state, never worth surfacing as an error.

export const AUDIT_FILTER_STORAGE_KEY = 'nexus.auditFilter.v1'

const VALID_MODULES = new Set<AuditModule | 'all'>([
  'all',
  'analyst',
  'sentinel',
  'trader',
  'broker',
  'ai',
  'system',
])

/** Validate a parsed JSON blob against the AuditFilter shape. */
const isValidFilter = (raw: unknown): raw is AuditFilter => {
  if (typeof raw !== 'object' || raw === null) return false
  const r = raw as Record<string, unknown>
  if (typeof r.query !== 'string') return false
  if (typeof r.module !== 'string') return false
  if (!VALID_MODULES.has(r.module as AuditModule | 'all')) return false
  // decisionId is optional and, when present, must be a string.
  if (r.decisionId !== undefined && typeof r.decisionId !== 'string') return false
  return true
}

/** Read the persisted filter (or EMPTY_FILTER on any failure). */
export const loadAuditFilter = (): AuditFilter => {
  if (typeof window === 'undefined') return EMPTY_FILTER
  try {
    const raw = window.localStorage.getItem(AUDIT_FILTER_STORAGE_KEY)
    if (raw === null) return EMPTY_FILTER
    const parsed = JSON.parse(raw) as unknown
    return isValidFilter(parsed) ? parsed : EMPTY_FILTER
  } catch {
    return EMPTY_FILTER
  }
}

/** True when the filter is the no-op default. */
export const isEmptyFilter = (f: AuditFilter): boolean =>
  f.module === 'all' && f.query === '' && !f.decisionId

/** Persist (or, when the filter is empty, clear) the stored value. */
export const saveAuditFilter = (filter: AuditFilter): void => {
  if (typeof window === 'undefined') return
  try {
    if (isEmptyFilter(filter)) {
      window.localStorage.removeItem(AUDIT_FILTER_STORAGE_KEY)
    } else {
      window.localStorage.setItem(
        AUDIT_FILTER_STORAGE_KEY,
        JSON.stringify(filter),
      )
    }
  } catch {
    // intentionally swallow — see header comment
  }
}
