import { describe, it, expect, beforeEach } from 'vitest'
import {
  filterAuditEntries,
  uniqueModules,
  EMPTY_FILTER,
  loadAuditFilter,
  saveAuditFilter,
  AUDIT_FILTER_STORAGE_KEY,
} from '@/ui/audit-filter'
import type { AuditEntry, AuditModule, AuditEventType } from '@/types/audit'

let seq = 0
const entry = (
  module: AuditModule,
  eventType: AuditEventType,
  summary: string,
): AuditEntry => ({
  id: `e${seq++}`,
  timestamp: 1_700_000_000_000,
  module,
  eventType,
  summary,
  data: {},
  _source: 't',
})

describe('filterAuditEntries', () => {
  const corpus: AuditEntry[] = [
    entry('ai', 'AI_PROMPT_SENT', 'claude prompted'),
    entry('ai', 'AI_RESPONSE_VALIDATED', 'claude validated'),
    entry('sentinel', 'SENTINEL_APPROVED', 'approved BUY BTCUSD'),
    entry('sentinel', 'SENTINEL_VETOED', 'vetoed SELL (DATA_TOO_OLD)'),
    entry('trader', 'ORDER_FILLED', 'filled buy 0.1 BTCUSD'),
    entry('system', 'SAFE_MODE_ACTIVATED', 'safe mode enabled'),
  ]

  it('returns the input unchanged under EMPTY_FILTER', () => {
    const out = filterAuditEntries(corpus, EMPTY_FILTER)
    expect(out).toBe(corpus) // reference preserved on the no-op path
  })

  it('filters by module', () => {
    const out = filterAuditEntries(corpus, { module: 'sentinel', query: '' })
    expect(out).toHaveLength(2)
    expect(out.every((e) => e.module === 'sentinel')).toBe(true)
  })

  it('matches query against eventType (case-insensitive)', () => {
    const out = filterAuditEntries(corpus, { module: 'all', query: 'veto' })
    expect(out).toHaveLength(1)
    expect(out[0].eventType).toBe('SENTINEL_VETOED')
  })

  it('matches query against summary (case-insensitive)', () => {
    const out = filterAuditEntries(corpus, {
      module: 'all',
      query: 'data_too_old',
    })
    expect(out).toHaveLength(1)
    expect(out[0].eventType).toBe('SENTINEL_VETOED')
  })

  it('combines module and query (AND, not OR)', () => {
    const out = filterAuditEntries(corpus, {
      module: 'ai',
      query: 'validated',
    })
    expect(out).toHaveLength(1)
    expect(out[0].eventType).toBe('AI_RESPONSE_VALIDATED')
  })

  it('returns empty when nothing matches', () => {
    const out = filterAuditEntries(corpus, {
      module: 'trader',
      query: 'veto',
    })
    expect(out).toEqual([])
  })

  it('ignores leading/trailing whitespace in the query', () => {
    const out = filterAuditEntries(corpus, { module: 'all', query: '  veto  ' })
    expect(out).toHaveLength(1)
  })

  it('does not mutate the input array', () => {
    const snapshot = [...corpus]
    filterAuditEntries(corpus, { module: 'sentinel', query: 'veto' })
    expect(corpus).toEqual(snapshot)
  })
})

describe('uniqueModules', () => {
  it('returns the sorted distinct module list', () => {
    const entries: AuditEntry[] = [
      entry('trader', 'ORDER_FILLED', 'x'),
      entry('ai', 'AI_PROMPT_SENT', 'x'),
      entry('trader', 'ORDER_REJECTED', 'x'),
      entry('sentinel', 'SENTINEL_APPROVED', 'x'),
    ]
    expect(uniqueModules(entries)).toEqual(['ai', 'sentinel', 'trader'])
  })

  it('returns empty array for an empty input', () => {
    expect(uniqueModules([])).toEqual([])
  })
})

describe('audit filter persistence', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns EMPTY_FILTER when nothing is stored', () => {
    expect(loadAuditFilter()).toEqual(EMPTY_FILTER)
  })

  it('round-trips a non-empty filter', () => {
    const f = { module: 'sentinel' as const, query: 'veto' }
    saveAuditFilter(f)
    expect(loadAuditFilter()).toEqual(f)
  })

  it('clears the storage key when the filter is reset to empty', () => {
    saveAuditFilter({ module: 'ai', query: 'x' })
    expect(window.localStorage.getItem(AUDIT_FILTER_STORAGE_KEY)).not.toBeNull()
    saveAuditFilter(EMPTY_FILTER)
    expect(window.localStorage.getItem(AUDIT_FILTER_STORAGE_KEY)).toBeNull()
  })

  it('falls back to EMPTY_FILTER on malformed JSON', () => {
    window.localStorage.setItem(AUDIT_FILTER_STORAGE_KEY, '{not json')
    expect(loadAuditFilter()).toEqual(EMPTY_FILTER)
  })

  it('rejects a payload with the wrong shape', () => {
    window.localStorage.setItem(
      AUDIT_FILTER_STORAGE_KEY,
      JSON.stringify({ module: 42, query: null }),
    )
    expect(loadAuditFilter()).toEqual(EMPTY_FILTER)
  })

  it('rejects an unknown module value', () => {
    window.localStorage.setItem(
      AUDIT_FILTER_STORAGE_KEY,
      JSON.stringify({ module: 'malicious', query: '' }),
    )
    expect(loadAuditFilter()).toEqual(EMPTY_FILTER)
  })

  it('accepts every documented module', () => {
    const modules = ['analyst', 'sentinel', 'trader', 'broker', 'ai', 'system'] as const
    for (const m of modules) {
      saveAuditFilter({ module: m, query: '' })
      expect(loadAuditFilter().module).toBe(m)
    }
  })
})
