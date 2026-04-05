import { describe, it, expect } from 'vitest'
import { INSTRUMENTS, INSTRUMENT_MAP } from '@/providers/mock/instruments'

describe('instruments', () => {
  it('contains all expected commodities', () => {
    const commodities = INSTRUMENTS.filter((i) => i.assetClass === 'commodity')
    const ids = commodities.map((c) => c.id)
    expect(ids).toContain('XAU-USD')
    expect(ids).toContain('XAG-USD')
    expect(ids).toContain('WTI')
    expect(ids).toContain('NG')
    expect(ids).toContain('HG')
  })

  it('has at least 19 instruments', () => {
    expect(INSTRUMENTS.length).toBeGreaterThanOrEqual(19)
  })

  it('all IDs are unique', () => {
    const ids = INSTRUMENTS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('INSTRUMENT_MAP contains all instruments', () => {
    for (const inst of INSTRUMENTS) {
      expect(INSTRUMENT_MAP[inst.id]).toBeDefined()
      expect(INSTRUMENT_MAP[inst.id].symbol).toBe(inst.symbol)
    }
  })

  it('all instruments have required fields', () => {
    for (const inst of INSTRUMENTS) {
      expect(inst.id).toBeTruthy()
      expect(inst.symbol).toBeTruthy()
      expect(inst.name).toBeTruthy()
      expect(inst.assetClass).toBeTruthy()
      expect(inst.exchange).toBeTruthy()
      expect(inst.baseCurrency).toBeTruthy()
      expect(inst.quoteCurrency).toBeTruthy()
    }
  })

  it('covers all expected asset classes', () => {
    const classes = new Set(INSTRUMENTS.map((i) => i.assetClass))
    expect(classes.has('crypto_spot')).toBe(true)
    expect(classes.has('crypto_perp')).toBe(true)
    expect(classes.has('us_equity')).toBe(true)
    expect(classes.has('forex')).toBe(true)
    expect(classes.has('index')).toBe(true)
    expect(classes.has('commodity')).toBe(true)
  })
})
