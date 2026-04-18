// ─── NAV CATEGORIES — 2-level navigation map ────────────────
//
// The top bar groups the 16 screens into 5 thematic categories so the
// primary nav stays scannable. The active category is derived from the
// current screen, and clicking a category jumps to that category's
// FIRST screen if you're not already inside it (otherwise no-op — we
// don't reset deep state on a self-click).
//
// `detail` is intentionally NOT in any category list: it's the dashboard
// drilldown, only reachable by clicking an instrument row, and shouldn't
// appear in the secondary subnav. It still maps to the `markets` category
// for the active-tab highlight when a user is drilled in.

import type { Screen } from '@/store/market'

export type CategoryId = 'markets' | 'bots' | 'research' | 'info' | 'system'

export interface CategoryDef {
  id: CategoryId
  label: string
  /** Visible screens in the secondary subnav, in display order. */
  screens: readonly Screen[]
}

export const CATEGORIES: readonly CategoryDef[] = [
  {
    id: 'markets',
    label: 'Marchés',
    screens: ['dashboard', 'scanner', 'correlation', 'macro'],
  },
  {
    id: 'bots',
    label: 'Bots',
    screens: ['chain', 'sentinel', 'trader'],
  },
  {
    id: 'research',
    label: 'Recherche',
    screens: ['backtest', 'quality'],
  },
  {
    id: 'info',
    label: 'Informations',
    screens: ['vcflow', 'corporate', 'alerts', 'journal'],
  },
  {
    id: 'system',
    label: 'Système',
    screens: ['sources', 'export'],
  },
] as const

// Screens that belong to a category but don't render in the subnav
// (currently: detail = dashboard drilldown).
const HIDDEN_TO_CATEGORY: Partial<Record<Screen, CategoryId>> = {
  detail: 'markets',
}

/**
 * Returns the category id for a given screen. Falls back to 'markets'
 * for any unmapped screen (defensive — every Screen should be covered
 * by either CATEGORIES or HIDDEN_TO_CATEGORY).
 */
export const categoryOf = (screen: Screen): CategoryId => {
  for (const cat of CATEGORIES) {
    if (cat.screens.includes(screen)) return cat.id
  }
  const hidden = HIDDEN_TO_CATEGORY[screen]
  if (hidden) return hidden
  return 'markets'
}

/**
 * Returns the screens that should render in the secondary subnav for a
 * given category. Hidden screens (detail) are excluded by construction.
 */
export const screensForCategory = (id: CategoryId): readonly Screen[] => {
  const cat = CATEGORIES.find((c) => c.id === id)
  return cat ? cat.screens : []
}

/**
 * The "landing" screen for a category — the first item in its subnav.
 * Used when the user clicks a category tab they're not currently in.
 */
export const landingOf = (id: CategoryId): Screen => {
  const screens = screensForCategory(id)
  // Every defined category has at least one screen, but fall back
  // defensively in case the map ever gets out of sync.
  return screens[0] ?? 'dashboard'
}
