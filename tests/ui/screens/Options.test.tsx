import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { Options } from '@/ui/screens/Options'
import {
  THEME_STORAGE_KEY,
  DENSITY_STORAGE_KEY,
} from '@/ui/prefs'

// ─── ENVIRONMENT SETUP ──────────────────────────────────────
// The Options screen reads loadTheme()/loadDensity() at render and writes
// via setTheme/setDensity, both of which trigger setTimeout-deferred page
// reloads. Fake timers prevent the reload from firing while keeping the
// synchronous localStorage write observable.
beforeEach(() => {
  window.localStorage.clear()
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('<Options /> — chrome', () => {
  it('renders the page title and intro', () => {
    render(<Options />)
    expect(screen.getByRole('heading', { level: 1, name: 'Options' })).toBeInTheDocument()
  })

  it('renders all 8 documented sections', () => {
    render(<Options />)
    for (const title of [
      'Apparence',
      'Données',
      'Notifications',
      'Layout',
      'Raccourcis clavier',
      "Rétention de l'audit",
      'Workspaces',
      'Avancé',
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument()
    }
  })
})

describe('<Options /> — Apparence section (theme + density wired)', () => {
  it('exposes the theme as a segmented control with Sombre + Clair', () => {
    render(<Options />)
    const group = screen.getByRole('group', { name: /thème/i })
    expect(within(group).getByRole('button', { name: /sombre/i })).toBeInTheDocument()
    expect(within(group).getByRole('button', { name: /clair/i })).toBeInTheDocument()
  })

  it('marks the current theme as pressed (defaults to dark)', () => {
    render(<Options />)
    const group = screen.getByRole('group', { name: /thème/i })
    const dark = within(group).getByRole('button', { name: /sombre/i })
    const light = within(group).getByRole('button', { name: /clair/i })
    expect(dark).toHaveAttribute('aria-pressed', 'true')
    expect(light).toHaveAttribute('aria-pressed', 'false')
  })

  it('persists the theme to localStorage when a different option is clicked', () => {
    render(<Options />)
    const group = screen.getByRole('group', { name: /thème/i })
    fireEvent.click(within(group).getByRole('button', { name: /clair/i }))
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })

  it('does NOT write when the active theme is re-clicked', () => {
    // Active is dark by default. Re-clicking should be a no-op so we
    // don't queue a useless reload.
    render(<Options />)
    const group = screen.getByRole('group', { name: /thème/i })
    fireEvent.click(within(group).getByRole('button', { name: /sombre/i }))
    // Nothing should have been written.
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
  })

  it('exposes density as compact / confort / spacieux', () => {
    render(<Options />)
    const group = screen.getByRole('group', { name: /densité/i })
    expect(within(group).getByRole('button', { name: /compact/i })).toBeInTheDocument()
    expect(within(group).getByRole('button', { name: /confort/i })).toBeInTheDocument()
    expect(within(group).getByRole('button', { name: /spacieux/i })).toBeInTheDocument()
  })

  it('persists the density to localStorage on change', () => {
    render(<Options />)
    const group = screen.getByRole('group', { name: /densité/i })
    fireEvent.click(within(group).getByRole('button', { name: /spacieux/i }))
    expect(window.localStorage.getItem(DENSITY_STORAGE_KEY)).toBe('spacious')
  })

  it('reads the persisted density on mount', () => {
    window.localStorage.setItem(DENSITY_STORAGE_KEY, 'compact')
    render(<Options />)
    const group = screen.getByRole('group', { name: /densité/i })
    const compact = within(group).getByRole('button', { name: /compact/i })
    const comfy = within(group).getByRole('button', { name: /confort/i })
    expect(compact).toHaveAttribute('aria-pressed', 'true')
    expect(comfy).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('<Options /> — Hotkeys section (read-only inventory)', () => {
  it('lists at least the run-chain shortcut with key + scope', () => {
    render(<Options />)
    expect(screen.getByText(/Lance la chaîne de décision/i)).toBeInTheDocument()
    expect(screen.getByText('Chain monitor')).toBeInTheDocument()
    // The key chip itself.
    expect(screen.getAllByText('r').some((el) => el.tagName === 'KBD')).toBe(true)
  })

  it('lists the Esc shortcut for the drilldown', () => {
    render(<Options />)
    expect(screen.getByText(/Ferme la fenêtre de drilldown/i)).toBeInTheDocument()
    expect(screen.getByText('Detail / Drilldown')).toBeInTheDocument()
  })
})
