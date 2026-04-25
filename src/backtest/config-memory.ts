// ─── BACKTEST CONFIG MEMORY — survive reloads ────────────────
//
// Persists the user's last-used `BacktestConfig` to localStorage so
// reload (theme change, density flip, full refresh) lands them back on
// the strategy they were tuning instead of the default. Same versioned
// `nexus.*.v1` pattern as `screen-memory.ts` and `timeframe-memory.ts`.
//
// All failures (no localStorage, malformed JSON, wrong shape) fall
// back to `null` so the screen can default to `DEFAULT_CONFIG` —
// this is purely cosmetic; a bad read must never keep the screen
// from booting.

import { DEFAULT_CONFIG, type BacktestConfig } from './types'
import type { SignalType } from '@/types'

export const BACKTEST_CONFIG_STORAGE_KEY = 'nexus.backtest-config.v1'

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v)

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string')

/**
 * Validate a parsed object as a `BacktestConfig`. Returns `null` for
 * anything that doesn't have the full required shape, so a stale entry
 * from an older schema can never feed half-undefined values into the
 * engine.
 */
const isBacktestConfig = (v: unknown): v is BacktestConfig => {
  if (!v || typeof v !== 'object') return false
  const c = v as Record<string, unknown>
  return (
    typeof c.instrumentId === 'string' &&
    isStringArray(c.entrySignals) &&
    isFiniteNumber(c.minStrength) &&
    isFiniteNumber(c.stopLoss) &&
    isFiniteNumber(c.takeProfit) &&
    isFiniteNumber(c.trailingStop) &&
    isFiniteNumber(c.maxBars) &&
    isFiniteNumber(c.initialCapital) &&
    isFiniteNumber(c.positionSize) &&
    isFiniteNumber(c.commission)
  )
}

export const loadBacktestConfig = (): BacktestConfig | null => {
  try {
    const raw = globalThis.localStorage?.getItem(BACKTEST_CONFIG_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!isBacktestConfig(parsed)) return null
    // Cast entrySignals through SignalType — the JSON parse gives us
    // string[] and isStringArray validates that, but the engine wants
    // the narrower SignalType[]. Unknown signal strings would just
    // miss any matches downstream rather than crash, so we don't
    // gate on enum membership here.
    return { ...parsed, entrySignals: parsed.entrySignals as SignalType[] }
  } catch {
    return null
  }
}

export const saveBacktestConfig = (cfg: BacktestConfig): void => {
  try {
    globalThis.localStorage?.setItem(
      BACKTEST_CONFIG_STORAGE_KEY,
      JSON.stringify(cfg),
    )
  } catch {
    /* localStorage unavailable — silently no-op */
  }
}

export const clearBacktestConfig = (): void => {
  try {
    globalThis.localStorage?.removeItem(BACKTEST_CONFIG_STORAGE_KEY)
  } catch {
    /* no-op */
  }
}

/** Convenience: return the persisted config, falling back to the
 *  shipped defaults. Used by `Backtest.tsx` at module load. */
export const initialBacktestConfig = (): BacktestConfig =>
  loadBacktestConfig() ?? { ...DEFAULT_CONFIG }
