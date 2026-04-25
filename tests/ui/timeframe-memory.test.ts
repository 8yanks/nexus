import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadTimeframeState,
  saveTimeframeState,
  clearTimeframeState,
  isTimeframe,
  TIMEFRAME_STORAGE_KEY,
  VALID_TIMEFRAMES,
  DEFAULT_TIMEFRAME,
} from '@/ui/timeframe-memory'

// ─── TIMEFRAME MEMORY ─────────────────────────────────────────
// Mirror of screen-memory's contract — round-trips a small enum via
// localStorage and falls back to null on any parse / shape failure
// so a corrupted entry can never keep the app from booting.

describe('timeframe-memory', () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
  })

  it('VALID_TIMEFRAMES exposes the canonical 6-entry enum', () => {
    expect([...VALID_TIMEFRAMES]).toEqual(['1m', '5m', '15m', '1h', '4h', '1d'])
  })

  it('DEFAULT_TIMEFRAME is 1h (matches the WS-tracked path)', () => {
    expect(DEFAULT_TIMEFRAME).toBe('1h')
  })

  it('isTimeframe accepts every valid TF and rejects everything else', () => {
    for (const tf of VALID_TIMEFRAMES) expect(isTimeframe(tf)).toBe(true)
    expect(isTimeframe('30m')).toBe(false)
    expect(isTimeframe('')).toBe(false)
    expect(isTimeframe(null)).toBe(false)
    expect(isTimeframe(undefined)).toBe(false)
    expect(isTimeframe(60)).toBe(false)
    expect(isTimeframe({ tf: '1h' })).toBe(false)
  })

  it('loadTimeframeState returns null when nothing is stored', () => {
    expect(loadTimeframeState()).toBeNull()
  })

  it('saveTimeframeState + loadTimeframeState round-trip every valid TF', () => {
    for (const tf of VALID_TIMEFRAMES) {
      saveTimeframeState(tf)
      expect(loadTimeframeState()).toBe(tf)
    }
  })

  it('rejects malformed JSON in storage (returns null)', () => {
    globalThis.localStorage.setItem(TIMEFRAME_STORAGE_KEY, '{not-json')
    expect(loadTimeframeState()).toBeNull()
  })

  it('rejects unknown enum values in storage', () => {
    globalThis.localStorage.setItem(TIMEFRAME_STORAGE_KEY, JSON.stringify('30m'))
    expect(loadTimeframeState()).toBeNull()
  })

  it('rejects non-string payloads (numeric, object, array)', () => {
    globalThis.localStorage.setItem(TIMEFRAME_STORAGE_KEY, JSON.stringify(60))
    expect(loadTimeframeState()).toBeNull()

    globalThis.localStorage.setItem(TIMEFRAME_STORAGE_KEY, JSON.stringify({ tf: '1h' }))
    expect(loadTimeframeState()).toBeNull()

    globalThis.localStorage.setItem(TIMEFRAME_STORAGE_KEY, JSON.stringify(['1h']))
    expect(loadTimeframeState()).toBeNull()
  })

  it('clearTimeframeState removes the entry', () => {
    saveTimeframeState('5m')
    expect(loadTimeframeState()).toBe('5m')
    clearTimeframeState()
    expect(loadTimeframeState()).toBeNull()
  })
})
