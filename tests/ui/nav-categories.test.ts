import { describe, it, expect } from 'vitest'
import {
  CATEGORIES,
  categoryOf,
  landingOf,
  screensForCategory,
} from '@/ui/nav-categories'
import type { Screen } from '@/store/market'

describe('CATEGORIES shape', () => {
  it('defines exactly 5 categories in the documented order', () => {
    expect(CATEGORIES.map((c) => c.id)).toEqual([
      'markets',
      'bots',
      'research',
      'info',
      'system',
    ])
  })

  it('every category has a non-empty screens list', () => {
    for (const cat of CATEGORIES) {
      expect(cat.screens.length).toBeGreaterThan(0)
    }
  })

  it('each visible screen belongs to exactly one category', () => {
    const seen = new Map<Screen, string>()
    for (const cat of CATEGORIES) {
      for (const s of cat.screens) {
        expect(seen.has(s)).toBe(false)
        seen.set(s, cat.id)
      }
    }
  })

  it('covers every Screen except the hidden drilldown', () => {
    const allScreens: readonly Screen[] = [
      'dashboard',
      'scanner',
      'correlation',
      'macro',
      'chain',
      'sentinel',
      'trader',
      'backtest',
      'quality',
      'vcflow',
      'corporate',
      'alerts',
      'journal',
      'sources',
      'export',
      'options',
    ]
    const visible = new Set(CATEGORIES.flatMap((c) => c.screens))
    for (const s of allScreens) {
      expect(visible.has(s)).toBe(true)
    }
    // 'detail' is intentionally hidden — it's the drilldown.
    expect(visible.has('detail')).toBe(false)
  })
})

describe('categoryOf', () => {
  it('resolves visible screens to their owning category', () => {
    expect(categoryOf('dashboard')).toBe('markets')
    expect(categoryOf('chain')).toBe('bots')
    expect(categoryOf('sentinel')).toBe('bots')
    expect(categoryOf('quality')).toBe('research')
    expect(categoryOf('vcflow')).toBe('info')
    expect(categoryOf('export')).toBe('system')
  })

  it('maps the hidden detail screen to markets so the subnav stays', () => {
    expect(categoryOf('detail')).toBe('markets')
  })
})

describe('screensForCategory', () => {
  it('returns the documented subscreens per category', () => {
    expect(screensForCategory('markets')).toEqual([
      'dashboard',
      'scanner',
      'correlation',
      'macro',
    ])
    expect(screensForCategory('bots')).toEqual(['chain', 'sentinel', 'trader'])
    expect(screensForCategory('system')).toEqual(['sources', 'export', 'options', 'legal'])
  })
})

describe('landingOf', () => {
  it('returns the first subscreen of each category', () => {
    expect(landingOf('markets')).toBe('dashboard')
    expect(landingOf('bots')).toBe('chain')
    expect(landingOf('research')).toBe('backtest')
    expect(landingOf('info')).toBe('vcflow')
    expect(landingOf('system')).toBe('sources')
  })
})
