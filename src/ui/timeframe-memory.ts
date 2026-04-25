// ─── TIMEFRAME MEMORY — survive theme/density/workspace reloads ────
//
// Mirror of `screen-memory.ts`. Persists the user's selected chart
// timeframe ('1m' | '5m' | '15m' | '1h' | '4h' | '1d') across reloads
// triggered by `setTheme` / `setDensity` / `applyWorkspace` so a
// quick theme tweak doesn't snap the chart back to the default 1h.
//
// All failures (no localStorage, malformed JSON, unknown enum) fall
// back to `null` so the store can default to '1h' — this state is
// purely cosmetic; a bad read must never keep the app from booting.

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d'

export const TIMEFRAME_STORAGE_KEY = 'nexus.timeframe.v1'

/** Single source of truth for the picker UI + validator. Keep in sync
 *  with the `Timeframe` union above. */
export const VALID_TIMEFRAMES: readonly Timeframe[] = [
  '1m',
  '5m',
  '15m',
  '1h',
  '4h',
  '1d',
] as const

/** Default when no persisted state exists. 1h matches the existing
 *  WS-tracked path on Binance/Coinbase, so first-load behaviour is
 *  identical to the pre-multi-TF era. */
export const DEFAULT_TIMEFRAME: Timeframe = '1h'

const VALID_SET = new Set<string>(VALID_TIMEFRAMES)

export const isTimeframe = (v: unknown): v is Timeframe =>
  typeof v === 'string' && VALID_SET.has(v)

export const loadTimeframeState = (): Timeframe | null => {
  try {
    const raw = globalThis.localStorage?.getItem(TIMEFRAME_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!isTimeframe(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

export const saveTimeframeState = (tf: Timeframe): void => {
  try {
    globalThis.localStorage?.setItem(
      TIMEFRAME_STORAGE_KEY,
      JSON.stringify(tf),
    )
  } catch {
    /* localStorage unavailable — silently no-op */
  }
}

export const clearTimeframeState = (): void => {
  try {
    globalThis.localStorage?.removeItem(TIMEFRAME_STORAGE_KEY)
  } catch {
    /* no-op */
  }
}
