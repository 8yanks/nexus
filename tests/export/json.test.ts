import { describe, it, expect } from 'vitest'
import { buildExportPayload } from '@/export/json'
import type { Instrument, MarketSnapshot, SignalEvent, DataQualityReport } from '@/types'

describe('JSON Export', () => {
  it('builds payload with correct structure', () => {
    const instruments: Instrument[] = []
    const snapshots: Record<string, MarketSnapshot> = {}
    const analytics: Record<string, null> = {}
    const signals: SignalEvent[] = []
    const quality: Record<string, DataQualityReport> = {}

    const payload = buildExportPayload(instruments, snapshots, analytics, signals, quality)

    expect(payload.exportedAt).toBeTruthy()
    expect(payload.instrumentCount).toBe(0)
    expect(payload.instruments).toEqual([])
    expect(payload._meta.version).toBe('1.0.0')
    expect(payload._meta.source).toBe('nexus_market_monitor')
  })

  it('includes instrument count', () => {
    const instruments = [{ id: 'a' }, { id: 'b' }] as Instrument[]
    const payload = buildExportPayload(instruments, {}, {}, [], {})
    expect(payload.instrumentCount).toBe(2)
  })

  it('passes through all data fields', () => {
    const signals = [{ id: 'sig1' }] as SignalEvent[]
    const payload = buildExportPayload([], {}, {}, signals, {})
    expect(payload.signals).toHaveLength(1)
    expect(payload.signals[0].id).toBe('sig1')
  })

  it('sets exportedAt to current time', () => {
    const before = new Date().toISOString()
    const payload = buildExportPayload([], {}, {}, [], {})
    expect(payload.exportedAt >= before).toBe(true)
  })
})
