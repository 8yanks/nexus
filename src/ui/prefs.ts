// ─── USER PREFERENCES — theme + density ─────────────────────
//
// Tiny module owned by the UI layer. Reads the persisted preferences at
// module-load time (so `theme.ts` can pick the active palette before
// React even mounts), exposes typed setters that re-persist + reload
// the page (live switching ships in a future commit).
//
// Storage keys are versioned (`v1`) so a future schema change can ignore
// stale entries instead of crashing on shape mismatch.

import type { ThemeName, DensityName } from './tokens'

export const THEME_STORAGE_KEY = 'nexus.theme.v1'
export const DENSITY_STORAGE_KEY = 'nexus.density.v1'

export const DEFAULT_THEME: ThemeName = 'dark'
export const DEFAULT_DENSITY: DensityName = 'comfy'

const isThemeName = (v: unknown): v is ThemeName =>
  v === 'dark' || v === 'light'

const isDensityName = (v: unknown): v is DensityName =>
  v === 'compact' || v === 'comfy' || v === 'spacious'

/**
 * Reads the persisted theme. Falls back to the default on any failure
 * (no localStorage in SSR, malformed value, unknown enum). Pure — safe
 * to call at top-level of theme.ts.
 */
export const loadTheme = (): ThemeName => {
  try {
    const raw = globalThis.localStorage?.getItem(THEME_STORAGE_KEY)
    if (isThemeName(raw)) return raw
  } catch {
    /* localStorage unavailable — fall through */
  }
  return DEFAULT_THEME
}

export const loadDensity = (): DensityName => {
  try {
    const raw = globalThis.localStorage?.getItem(DENSITY_STORAGE_KEY)
    if (isDensityName(raw)) return raw
  } catch {
    /* localStorage unavailable — fall through */
  }
  return DEFAULT_DENSITY
}

/**
 * Persists the new theme + reloads the page so `theme.ts` re-resolves
 * its `colors` export against the new palette. A future commit will
 * migrate `colors` to CSS variables and remove the reload.
 */
export const setTheme = (theme: ThemeName): void => {
  try {
    globalThis.localStorage?.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    /* localStorage unavailable — silently no-op */
  }
  // Defer reload so React can flush the click handler that triggered us.
  if (typeof globalThis.location !== 'undefined') {
    setTimeout(() => globalThis.location.reload(), 0)
  }
}

export const setDensity = (density: DensityName): void => {
  try {
    globalThis.localStorage?.setItem(DENSITY_STORAGE_KEY, density)
  } catch {
    /* localStorage unavailable — silently no-op */
  }
  if (typeof globalThis.location !== 'undefined') {
    setTimeout(() => globalThis.location.reload(), 0)
  }
}
