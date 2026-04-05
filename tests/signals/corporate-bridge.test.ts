import { describe, it, expect } from 'vitest'
import { corporateToSignals, macroToSignals } from '@/signals/corporate-bridge'
import type { CorporateEvent } from '@/corporate/types'
import type { MacroIndicator } from '@/macro/types'

// ─── HELPERS ────────────────────────────────────────────────

const mkCorporateEvent = (overrides: Partial<CorporateEvent> = {}): CorporateEvent => ({
  id: 'test-corp-1',
  instrumentId: 'AAPL',
  type: 'EARNINGS_SURPRISE',
  headline: 'AAPL beats earnings',
  summary: 'EPS above consensus',
  bias: 'bullish',
  priority: 'high',
  confidence: 0.8,
  impactScore: 0.75,
  timestamp: '2026-01-15T10:00:00Z',
  _source: 'mock_corporate',
  _status: 'SIMULATED',
  _provenance: { source: 'mock_corporate', fetchMethod: 'generated', latencyMs: 0 },
  ...overrides,
})

const mkMacroIndicator = (overrides: Partial<MacroIndicator> = {}): MacroIndicator => ({
  id: 'test-macro-1',
  name: 'Federal Funds Rate',
  shortName: 'FFR',
  category: 'RATES',
  region: 'US',
  value: 5.5,
  previousValue: 5.25,
  change: 0.25,
  changePct: 4.76,
  trend: 'rising',
  unit: '%',
  frequency: 'quarterly',
  lastUpdate: '2026-01-10T14:00:00Z',
  nextRelease: null,
  impact: 'high',
  description: 'Fed Funds Rate',
  _source: 'mock_macro',
  _status: 'SIMULATED',
  _provenance: { source: 'mock_macro', fetchMethod: 'generated', latencyMs: 0 },
  ...overrides,
})

// ─── CORPORATE BRIDGE ──────────────────────────────────────

describe('corporateToSignals', () => {
  it('converts a high-priority bullish event to a bullish signal', () => {
    const signals = corporateToSignals([mkCorporateEvent()])
    expect(signals).toHaveLength(1)
    expect(signals[0].type).toBe('CORP_EARNINGS_SURPRISE')
    expect(signals[0].direction).toBe('bullish')
    expect(signals[0].instrumentId).toBe('AAPL')
    expect(signals[0].strength).toBe(0.75)
    expect(signals[0].description).toContain('[Corporate]')
  })

  it('filters out low-priority events', () => {
    const signals = corporateToSignals([mkCorporateEvent({ priority: 'low' })])
    expect(signals).toHaveLength(0)
  })

  it('maps bearish bias to bearish direction', () => {
    const signals = corporateToSignals([mkCorporateEvent({ bias: 'bearish' })])
    expect(signals[0].direction).toBe('bearish')
  })

  it('maps neutral bias to neutral direction', () => {
    const signals = corporateToSignals([mkCorporateEvent({ bias: 'neutral' })])
    expect(signals[0].direction).toBe('neutral')
  })

  it('maps M&A events to CORP_MA_EVENT', () => {
    const signals = corporateToSignals([mkCorporateEvent({ type: 'MERGER_ACQUISITION' })])
    expect(signals[0].type).toBe('CORP_MA_EVENT')
  })

  it('maps insider buying to CORP_INSIDER_ACTIVITY', () => {
    const signals = corporateToSignals([mkCorporateEvent({ type: 'INSIDER_BUYING' })])
    expect(signals[0].type).toBe('CORP_INSIDER_ACTIVITY')
  })

  it('maps litigation to CORP_REGULATORY', () => {
    const signals = corporateToSignals([mkCorporateEvent({ type: 'LITIGATION' })])
    expect(signals[0].type).toBe('CORP_REGULATORY')
  })

  it('handles multiple events', () => {
    const events = [
      mkCorporateEvent({ id: 'e1', type: 'EARNINGS_SURPRISE' }),
      mkCorporateEvent({ id: 'e2', type: 'GUIDANCE_RAISE' }),
      mkCorporateEvent({ id: 'e3', type: 'BUYBACK' }),
    ]
    const signals = corporateToSignals(events)
    expect(signals).toHaveLength(3)
  })
})

// ─── MACRO BRIDGE ──────────────────────────────────────────

describe('macroToSignals', () => {
  it('converts a high-impact rising indicator to a bullish signal', () => {
    const signals = macroToSignals([mkMacroIndicator()])
    expect(signals).toHaveLength(1)
    expect(signals[0].type).toBe('MACRO_RATE_CHANGE')
    expect(signals[0].direction).toBe('bullish')
    expect(signals[0].instrumentId).toBe('MACRO')
    expect(signals[0].description).toContain('[Macro]')
  })

  it('filters out low-impact indicators', () => {
    const signals = macroToSignals([mkMacroIndicator({ impact: 'low' })])
    expect(signals).toHaveLength(0)
  })

  it('filters out small changes (< 0.5%)', () => {
    const signals = macroToSignals([mkMacroIndicator({ changePct: 0.1 })])
    expect(signals).toHaveLength(0)
  })

  it('maps falling trend to bearish', () => {
    const signals = macroToSignals([mkMacroIndicator({ trend: 'falling', changePct: -3.0 })])
    expect(signals[0].direction).toBe('bearish')
  })

  it('maps flat trend to neutral', () => {
    const signals = macroToSignals([mkMacroIndicator({ trend: 'flat', changePct: 1.0 })])
    expect(signals[0].direction).toBe('neutral')
  })

  it('maps INFLATION category to MACRO_INFLATION_SHIFT', () => {
    const signals = macroToSignals([mkMacroIndicator({ category: 'INFLATION', changePct: 2.0 })])
    expect(signals[0].type).toBe('MACRO_INFLATION_SHIFT')
  })

  it('maps SENTIMENT category to MACRO_SENTIMENT_SHIFT', () => {
    const signals = macroToSignals([mkMacroIndicator({ category: 'SENTIMENT', changePct: 5.0 })])
    expect(signals[0].type).toBe('MACRO_SENTIMENT_SHIFT')
  })

  it('caps strength at 1.0', () => {
    const signals = macroToSignals([mkMacroIndicator({ changePct: 50 })])
    expect(signals[0].strength).toBeLessThanOrEqual(1)
  })
})
