import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  loadTheme,
  loadDensity,
  setTheme,
  setDensity,
  THEME_STORAGE_KEY,
  DENSITY_STORAGE_KEY,
  DEFAULT_THEME,
  DEFAULT_DENSITY,
} from '@/ui/prefs'

beforeEach(() => {
  window.localStorage.clear()
})

describe('loadTheme', () => {
  it('returns the default when nothing is stored', () => {
    expect(loadTheme()).toBe(DEFAULT_THEME)
  })

  it('returns the persisted value when valid', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light')
    expect(loadTheme()).toBe('light')
  })

  it('falls back to default on an unknown enum value', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'midnight-blue')
    expect(loadTheme()).toBe(DEFAULT_THEME)
  })

  it('falls back to default when localStorage throws', () => {
    const orig = window.localStorage.getItem
    Object.defineProperty(window.localStorage, 'getItem', {
      value: () => {
        throw new Error('quota')
      },
      configurable: true,
    })
    try {
      expect(loadTheme()).toBe(DEFAULT_THEME)
    } finally {
      Object.defineProperty(window.localStorage, 'getItem', {
        value: orig,
        configurable: true,
      })
    }
  })
})

describe('loadDensity', () => {
  it('returns the default when nothing is stored', () => {
    expect(loadDensity()).toBe(DEFAULT_DENSITY)
  })

  it('round-trips every documented density', () => {
    for (const d of ['compact', 'comfy', 'spacious'] as const) {
      window.localStorage.setItem(DENSITY_STORAGE_KEY, d)
      expect(loadDensity()).toBe(d)
    }
  })

  it('falls back to default on an unknown value', () => {
    window.localStorage.setItem(DENSITY_STORAGE_KEY, 'tiny')
    expect(loadDensity()).toBe(DEFAULT_DENSITY)
  })
})

describe('setTheme / setDensity persistence', () => {
  // The setters defer the page reload via setTimeout. Fake timers stop
  // the reload from ever firing while keeping the synchronous write
  // observable. (window.location.reload is read-only in jsdom, so we
  // can't spy on it directly.)
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('setTheme writes the value to localStorage', () => {
    setTheme('light')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    vi.useRealTimers()
  })

  it('setDensity writes the value to localStorage', () => {
    setDensity('compact')
    expect(window.localStorage.getItem(DENSITY_STORAGE_KEY)).toBe('compact')
    vi.useRealTimers()
  })
})
