import { describe, it, expect } from 'vitest'
import { createRule, DEFAULT_RULES } from '@/alerts/rules'

describe('Alert Rules', () => {
  it('createRule generates an id when not provided', () => {
    const rule = createRule({
      instrumentId: 'BTC-USD-SPOT',
      type: 'price_above',
      value: 70000,
      active: true,
      severity: 'warning',
    })
    expect(rule.id).toBeTruthy()
    expect(rule.id.startsWith('alert_')).toBe(true)
  })

  it('createRule uses provided id', () => {
    const rule = createRule({
      id: 'custom_id',
      instrumentId: 'BTC-USD-SPOT',
      type: 'price_below',
      value: 60000,
      active: false,
      severity: 'critical',
    })
    expect(rule.id).toBe('custom_id')
  })

  it('createRule sets triggered=false and triggeredAt=null', () => {
    const rule = createRule({
      instrumentId: 'ETH-USD-SPOT',
      type: 'rsi_oversold',
      value: 30,
      active: true,
      severity: 'info',
    })
    expect(rule.triggered).toBe(false)
    expect(rule.triggeredAt).toBeNull()
  })

  it('DEFAULT_RULES has 7 rules', () => {
    expect(DEFAULT_RULES).toHaveLength(7)
  })

  it('DEFAULT_RULES covers BTC and ETH instruments', () => {
    const instruments = [...new Set(DEFAULT_RULES.map((r) => r.instrumentId))]
    expect(instruments).toContain('BTC-USD-SPOT')
    expect(instruments).toContain('ETH-USD-SPOT')
    expect(instruments).toContain('BTC-PERP')
    expect(instruments).toContain('ETH-PERP')
  })

  it('all DEFAULT_RULES are active', () => {
    expect(DEFAULT_RULES.every((r) => r.active)).toBe(true)
  })

  it('all DEFAULT_RULES have unique ids', () => {
    const ids = DEFAULT_RULES.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
