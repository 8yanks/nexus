import { describe, it, expect } from 'vitest'
import {
  filterAuditEntries,
  uniqueModules,
  EMPTY_FILTER,
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
