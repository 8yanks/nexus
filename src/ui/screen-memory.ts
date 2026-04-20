// ─── SCREEN MEMORY — survive theme/density/workspace reloads ────
//
// `setTheme` / `setDensity` / `applyWorkspace` trigger a full page
// reload so `theme.ts` can re-resolve its module-level palette const.
// Without persistence, every reload flips the user back to the
// default 'dashboard' — annoying when the whole point of changing
// the theme was a side-task while reading a specific screen.
//
// This module round-trips `screen` + `selectedInstrumentId` via
// localStorage. The shape is versioned (`v1`) so a future schema
// change can silently reject stale entries instead of crashing at
// mount. All failures (no localStorage, malformed JSON, unknown
// enum, wrong types) fall back to `null` so the store can default
// to 'dashboard' — this state is cosmetic; a bad read must never
// keep the app from booting.
//
// Used by `store/market.ts` at init (`loadScreenState()`) and on
// every `setScreen` / `selectInstrument` (`saveScreenState`).

import type { Screen } from '@/store/market'

export const SCREEN_STORAGE_KEY = 'nexus.screen.v1'

// Single source of truth for the Screen enum. Keep in sync with the
// `Screen` type in `store/market.ts` — a stale entry here would
// silently drop the new screen on load, not crash.
const VALID_SCREENS = new Set<Screen>([
  'dashboard',
  'detail',
  'scanner',
  'alerts',
  'quality',
  'sources',
  'export',
  'journal',
  'correlation',
  'backtest',
  'corporate',
  'vcflow',
  'macro',
  'chain',
  'sentinel',
  'trader',
  'options',
])

const isScreen = (v: unknown): v is Screen =>
  typeof v === 'string' && VALID_SCREENS.has(v as Screen)

export interface PersistedScreen {
  screen: Screen
  selectedInstrumentId: string | null
}

export const loadScreenState = (): PersistedScreen | null => {
  try {
    const raw = globalThis.localStorage?.getItem(SCREEN_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const obj = parsed as Record<string, unknown>
    if (!isScreen(obj.screen)) return null
    const id = obj.selectedInstrumentId
    if (id !== null && typeof id !== 'string') return null
    // Guard: 'detail' with no instrument id would render an empty
    // state. Fall back to 'dashboard' rather than boot into a broken
    // screen.
    if (obj.screen === 'detail' && id == null) {
      return { screen: 'dashboard', selectedInstrumentId: null }
    }
    return { screen: obj.screen, selectedInstrumentId: id }
  } catch {
    return null
  }
}

export const saveScreenState = (
  screen: Screen,
  selectedInstrumentId: string | null,
): void => {
  try {
    globalThis.localStorage?.setItem(
      SCREEN_STORAGE_KEY,
      JSON.stringify({ screen, selectedInstrumentId }),
    )
  } catch {
    /* localStorage unavailable — silently no-op */
  }
}

export const clearScreenState = (): void => {
  try {
    globalThis.localStorage?.removeItem(SCREEN_STORAGE_KEY)
  } catch {
    /* no-op */
  }
}
