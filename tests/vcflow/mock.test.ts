import { describe, it, expect } from 'vitest'
import { createMockVCProvider } from '@/vcflow/mock'
import { VC_SECTOR_CONFIGS, VC_DEAL_LABELS } from '@/vcflow/types'

describe('MockVCProvider', () => {
  const provider = createMockVCProvider()

  it('returns all deals', async () => {
    const deals = await provider.getAllDeals()
    expect(deals.length).toBeGreaterThan(0)
  })

  it('deals are sorted by timestamp (newest first)', async () => {
    const deals = await provider.getAllDeals()
    for (let i = 1; i < deals.length; i++) {
      expect(new Date(deals[i - 1].timestamp).getTime())
        .toBeGreaterThanOrEqual(new Date(deals[i].timestamp).getTime())
    }
  })

  it('filters by sector', async () => {
    const aiDeals = await provider.getDeals('AI_ML')
    expect(aiDeals.length).toBeGreaterThan(0)
    for (const d of aiDeals) {
      expect(d.sector).toBe('AI_ML')
    }
  })

  it('all deals have valid structure', async () => {
    const deals = await provider.getAllDeals()
    for (const d of deals) {
      expect(d.id).toBeTruthy()
      expect(d.companyName).toBeTruthy()
      expect(d.dealType in VC_DEAL_LABELS).toBe(true)
      expect(d.sector in VC_SECTOR_CONFIGS).toBe(true)
      expect(['US', 'EU', 'UK', 'ASIA', 'LATAM', 'OTHER']).toContain(d.geo)
      expect(d.investors).toBeInstanceOf(Array)
      expect(d.headline.length).toBeGreaterThan(0)
      expect(d.summary.length).toBeGreaterThan(0)
      expect(d.relatedTickers).toBeInstanceOf(Array)
      expect(d._status).toBe('SIMULATED')
    }
  })

  it('amount is null or a positive number', async () => {
    const deals = await provider.getAllDeals()
    for (const d of deals) {
      if (d.amount !== null) {
        expect(d.amount).toBeGreaterThan(0)
      }
    }
  })

  it('health check returns ok', async () => {
    const result = await provider.healthCheck()
    expect(result.ok).toBe(true)
  })
})
