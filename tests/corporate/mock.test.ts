import { describe, it, expect } from 'vitest'
import { createMockCorporateProvider } from '@/corporate/mock'
import { CORPORATE_EVENT_CONFIGS } from '@/corporate/types'

describe('MockCorporateProvider', () => {
  const provider = createMockCorporateProvider()

  it('returns all events', async () => {
    const events = await provider.getAllEvents()
    expect(events.length).toBeGreaterThan(0)
  })

  it('events are sorted by timestamp (newest first)', async () => {
    const events = await provider.getAllEvents()
    for (let i = 1; i < events.length; i++) {
      expect(new Date(events[i - 1].timestamp).getTime())
        .toBeGreaterThanOrEqual(new Date(events[i].timestamp).getTime())
    }
  })

  it('filters by instrumentId', async () => {
    const aapl = await provider.getEvents('aapl')
    expect(aapl.length).toBeGreaterThan(0)
    for (const ev of aapl) {
      expect(ev.instrumentId).toBe('aapl')
    }
  })

  it('returns empty for unknown instrument', async () => {
    const events = await provider.getEvents('unknown-ticker')
    expect(events).toHaveLength(0)
  })

  it('all events have valid structure', async () => {
    const events = await provider.getAllEvents()
    for (const ev of events) {
      expect(ev.id).toBeTruthy()
      expect(ev.instrumentId).toBeTruthy()
      expect(ev.type in CORPORATE_EVENT_CONFIGS).toBe(true)
      expect(ev.headline).toBeTruthy()
      expect(ev.summary.length).toBeGreaterThan(0)
      expect(['bullish', 'bearish', 'neutral']).toContain(ev.bias)
      expect(['high', 'medium', 'low']).toContain(ev.priority)
      expect(ev.confidence).toBeGreaterThanOrEqual(0)
      expect(ev.confidence).toBeLessThanOrEqual(1)
      expect(ev.impactScore).toBeGreaterThanOrEqual(0)
      expect(ev.impactScore).toBeLessThanOrEqual(1)
      expect(ev._status).toBe('SIMULATED')
    }
  })

  it('health check returns ok', async () => {
    const result = await provider.healthCheck()
    expect(result.ok).toBe(true)
  })
})
