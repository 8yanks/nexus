// ─── AUDIT FILTER HELPERS ───────────────────────────────────
// Pure filter logic for the ChainMonitor audit panel. Kept outside the
// component so the matching rules are unit-testable without JSDOM.

import type { AuditEntry, AuditModule } from '@/types/audit'

export interface AuditFilter {
  /** Restrict to a single module, or 'all' to pass through. */
  module: AuditModule | 'all'
  /** Case-insensitive substring against eventType + summary. Empty = no filter. */
  query: string
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

  if (!hasQuery && moduleFilter === 'all') return entries

  return entries.filter((e) => {
    if (moduleFilter !== 'all' && e.module !== moduleFilter) return false
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
