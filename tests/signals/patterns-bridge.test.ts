import { describe, it, expect } from 'vitest'
import { patternsToSignals } from '@/signals/patterns-bridge'
import type { DetectedPattern } from '@/analytics/patterns'

// ─── PATTERNS → SIGNALS BRIDGE ───────────────────────────────
// Validates the gate (PATTERN_MIN_CONFIDENCE) + the type mapping +
// the field plumbing. Real pattern detection lives in
// analytics/patterns.test.ts; this file only checks the bridge that
// surfaces detected patterns into the SignalEvent stream.

const mkPattern = (over: Partial<DetectedPattern> = {}): DetectedPattern => ({
  type: 'DOUBLE_TOP',
  direction: 'bearish',
  confidence: 0.75,
  startIndex: 10,
  endIndex: 30,
  neckline: 100,
  description: 'Double-top with confirmed neckline break',
  keyPoints: [
    { index: 12, price: 105, label: 'Top 1' },
    { index: 24, price: 105, label: 'Top 2' },
  ],
  ...over,
})

describe('patternsToSignals', () => {
  it('returns an empty array when no patterns are passed', () => {
    expect(patternsToSignals('BTC-USD-SPOT', [], 67000)).toEqual([])
  })

  it('drops patterns below PATTERN_MIN_CONFIDENCE (0.6)', () => {
    const ps = [
      mkPattern({ confidence: 0.45 }),
      mkPattern({ confidence: 0.59 }),
      mkPattern({ confidence: 0.6 }),
      mkPattern({ confidence: 0.9 }),
    ]
    const signals = patternsToSignals('BTC-USD-SPOT', ps, 67000)
    expect(signals).toHaveLength(2)
    // Only the 0.6 and 0.9 patterns survive.
    expect(signals.every((s) => s.strength >= 0.6)).toBe(true)
  })

  it('maps every PatternType to its corresponding SignalType', () => {
    const cases: Array<{ pt: DetectedPattern['type']; expected: string }> = [
      { pt: 'DOUBLE_TOP',                 expected: 'PATTERN_DOUBLE_TOP' },
      { pt: 'DOUBLE_BOTTOM',              expected: 'PATTERN_DOUBLE_BOTTOM' },
      { pt: 'HEAD_AND_SHOULDERS',         expected: 'PATTERN_HEAD_SHOULDERS' },
      { pt: 'INVERSE_HEAD_AND_SHOULDERS', expected: 'PATTERN_INV_HEAD_SHOULDERS' },
      { pt: 'ASCENDING_TRIANGLE',         expected: 'PATTERN_ASCENDING_TRIANGLE' },
      { pt: 'DESCENDING_TRIANGLE',        expected: 'PATTERN_DESCENDING_TRIANGLE' },
    ]
    for (const { pt, expected } of cases) {
      const sig = patternsToSignals('BTC-USD-SPOT', [mkPattern({ type: pt })], 67000)[0]
      expect(sig.type).toBe(expected)
    }
  })

  it('passes through the pattern direction unchanged', () => {
    const bullish = mkPattern({ type: 'DOUBLE_BOTTOM', direction: 'bullish' })
    const bearish = mkPattern({ type: 'DOUBLE_TOP', direction: 'bearish' })
    const sigs = patternsToSignals('BTC-USD-SPOT', [bullish, bearish], 67000)
    expect(sigs.find((s) => s.type === 'PATTERN_DOUBLE_BOTTOM')?.direction).toBe('bullish')
    expect(sigs.find((s) => s.type === 'PATTERN_DOUBLE_TOP')?.direction).toBe('bearish')
  })

  it('uses the pattern confidence as the signal strength', () => {
    const ps = [mkPattern({ confidence: 0.82 })]
    const [sig] = patternsToSignals('BTC-USD-SPOT', ps, 67000)
    expect(sig.strength).toBe(0.82)
  })

  it('embeds the neckline in the signal description', () => {
    const ps = [mkPattern({ neckline: 67500 })]
    const [sig] = patternsToSignals('BTC-USD-SPOT', ps, 67000)
    expect(sig.description).toMatch(/neckline 67500/)
    expect(sig.description).toMatch(/^\[Pattern\]/)
  })

  it('uses the current price (not the neckline) for the signal price field', () => {
    const ps = [mkPattern({ neckline: 67500 })]
    const [sig] = patternsToSignals('BTC-USD-SPOT', ps, 68900)
    expect(sig.price).toBe(68900)
  })

  it('threads the instrumentId onto every signal', () => {
    const ps = [
      mkPattern({ type: 'DOUBLE_TOP' }),
      mkPattern({ type: 'DOUBLE_BOTTOM', direction: 'bullish' }),
    ]
    const sigs = patternsToSignals('ETH-USD-SPOT', ps, 3500)
    expect(sigs.every((s) => s.instrumentId === 'ETH-USD-SPOT')).toBe(true)
  })

  it('marks the source as patterns_bridge for downstream filtering', () => {
    const sigs = patternsToSignals('BTC-USD-SPOT', [mkPattern()], 67000)
    expect(sigs[0]._source).toBe('patterns_bridge')
  })

  it('generates unique IDs per signal', () => {
    const ps = [mkPattern(), mkPattern({ type: 'DOUBLE_BOTTOM', direction: 'bullish' })]
    const sigs = patternsToSignals('BTC-USD-SPOT', ps, 67000)
    expect(new Set(sigs.map((s) => s.id)).size).toBe(sigs.length)
  })
})
