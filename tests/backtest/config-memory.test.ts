import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadBacktestConfig,
  saveBacktestConfig,
  clearBacktestConfig,
  initialBacktestConfig,
  BACKTEST_CONFIG_STORAGE_KEY,
} from '@/backtest/config-memory'
import { DEFAULT_CONFIG } from '@/backtest/types'

// ─── BACKTEST CONFIG MEMORY ──────────────────────────────────
// Mirror of timeframe-memory.test.ts shape — round-trip a structured
// object via localStorage with strict shape validation, falling back
// to null on any parse / shape failure so a bad entry can never feed
// half-undefined values into the engine.

describe('backtest config-memory', () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
  })

  it('loadBacktestConfig returns null when nothing is stored', () => {
    expect(loadBacktestConfig()).toBeNull()
  })

  it('initialBacktestConfig falls back to DEFAULT_CONFIG', () => {
    expect(initialBacktestConfig()).toEqual(DEFAULT_CONFIG)
  })

  it('initialBacktestConfig returns a fresh copy (not the same reference)', () => {
    const a = initialBacktestConfig()
    const b = initialBacktestConfig()
    expect(a).not.toBe(b) // mutable state must not bleed across screen mounts
    expect(a).toEqual(b)
  })

  it('save + load round-trips the full DEFAULT_CONFIG', () => {
    saveBacktestConfig(DEFAULT_CONFIG)
    expect(loadBacktestConfig()).toEqual(DEFAULT_CONFIG)
  })

  it('save + load round-trips a customized config', () => {
    const custom = {
      ...DEFAULT_CONFIG,
      instrumentId: 'ETH-USD-SPOT',
      stopLoss: 0.015,
      takeProfit: 0.06,
      positionSize: 0.05,
      entrySignals: ['EMA_CROSS_BULL'],
    }
    saveBacktestConfig(custom)
    expect(loadBacktestConfig()).toEqual(custom)
  })

  it('rejects malformed JSON in storage', () => {
    globalThis.localStorage.setItem(BACKTEST_CONFIG_STORAGE_KEY, '{not-json')
    expect(loadBacktestConfig()).toBeNull()
  })

  it('rejects payloads missing required numeric fields', () => {
    // Missing `stopLoss` — should fall back to null rather than feed
    // an undefined into the engine.
    const broken = { ...DEFAULT_CONFIG } as Record<string, unknown>
    delete broken.stopLoss
    globalThis.localStorage.setItem(BACKTEST_CONFIG_STORAGE_KEY, JSON.stringify(broken))
    expect(loadBacktestConfig()).toBeNull()
  })

  it('rejects payloads with non-finite numeric fields', () => {
    const broken = { ...DEFAULT_CONFIG, stopLoss: NaN }
    globalThis.localStorage.setItem(BACKTEST_CONFIG_STORAGE_KEY, JSON.stringify(broken))
    expect(loadBacktestConfig()).toBeNull()
  })

  it('rejects payloads with non-array entrySignals', () => {
    const broken = { ...DEFAULT_CONFIG, entrySignals: 'RSI_OVERSOLD' as unknown as string[] }
    globalThis.localStorage.setItem(BACKTEST_CONFIG_STORAGE_KEY, JSON.stringify(broken))
    expect(loadBacktestConfig()).toBeNull()
  })

  it('rejects payloads with non-string members in entrySignals', () => {
    const broken = { ...DEFAULT_CONFIG, entrySignals: [1, 2, 3] as unknown as string[] }
    globalThis.localStorage.setItem(BACKTEST_CONFIG_STORAGE_KEY, JSON.stringify(broken))
    expect(loadBacktestConfig()).toBeNull()
  })

  it('rejects non-object payloads (string, number, array, null)', () => {
    for (const v of ['"hi"', '42', '[1,2,3]', 'null']) {
      globalThis.localStorage.setItem(BACKTEST_CONFIG_STORAGE_KEY, v)
      expect(loadBacktestConfig()).toBeNull()
    }
  })

  it('clearBacktestConfig removes the entry', () => {
    saveBacktestConfig(DEFAULT_CONFIG)
    expect(loadBacktestConfig()).not.toBeNull()
    clearBacktestConfig()
    expect(loadBacktestConfig()).toBeNull()
  })

  it('initialBacktestConfig restores the persisted config when valid', () => {
    const custom = { ...DEFAULT_CONFIG, instrumentId: 'SOL-USD-SPOT', stopLoss: 0.025 }
    saveBacktestConfig(custom)
    expect(initialBacktestConfig()).toEqual(custom)
  })
})
