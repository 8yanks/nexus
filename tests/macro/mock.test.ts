import { describe, it, expect } from 'vitest'
import { createMockMacroProvider } from '@/macro/mock'
import { MACRO_CATEGORY_CONFIGS } from '@/macro/types'

describe('MockMacroProvider', () => {
  const provider = createMockMacroProvider()

  it('returns all indicators', async () => {
    const indicators = await provider.getIndicators()
    expect(indicators.length).toBeGreaterThan(0)
  })

  it('filters by category', async () => {
    const rates = await provider.getIndicators('RATES')
    expect(rates.length).toBeGreaterThan(0)
    for (const ind of rates) {
      expect(ind.category).toBe('RATES')
    }
  })

  it('all indicators have valid structure', async () => {
    const indicators = await provider.getIndicators()
    for (const ind of indicators) {
      expect(ind.id).toBeTruthy()
      expect(ind.name).toBeTruthy()
      expect(ind.shortName).toBeTruthy()
      expect(ind.category in MACRO_CATEGORY_CONFIGS).toBe(true)
      expect(['US', 'EU', 'UK', 'JP', 'CN', 'GLOBAL']).toContain(ind.region)
      expect(typeof ind.value).toBe('number')
      expect(typeof ind.previousValue).toBe('number')
      expect(['rising', 'falling', 'flat']).toContain(ind.trend)
      expect(['high', 'medium', 'low']).toContain(ind.impact)
      expect(ind.unit).toBeTruthy()
      expect(ind._status).toBe('SIMULATED')
    }
  })

  it('change and changePct are consistent', async () => {
    const indicators = await provider.getIndicators()
    for (const ind of indicators) {
      const expectedChange = ind.value - ind.previousValue
      expect(ind.change).toBeCloseTo(expectedChange, 6)

      if (ind.previousValue !== 0) {
        const expectedPct = expectedChange / ind.previousValue
        expect(ind.changePct).toBeCloseTo(expectedPct, 6)
      }
    }
  })

  it('returns calendar events', async () => {
    const calendar = await provider.getCalendar()
    expect(calendar.length).toBeGreaterThan(0)
  })

  it('calendar events are sorted by date', async () => {
    const calendar = await provider.getCalendar()
    for (let i = 1; i < calendar.length; i++) {
      expect(new Date(calendar[i - 1].scheduledAt).getTime())
        .toBeLessThanOrEqual(new Date(calendar[i].scheduledAt).getTime())
    }
  })

  it('past events have actual values', async () => {
    const calendar = await provider.getCalendar()
    const past = calendar.filter((e) => new Date(e.scheduledAt).getTime() < Date.now())
    for (const ev of past) {
      expect(ev.actual).not.toBeNull()
    }
  })

  it('health check returns ok', async () => {
    const result = await provider.healthCheck()
    expect(result.ok).toBe(true)
  })
})
