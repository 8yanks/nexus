import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { Dashboard } from '@/ui/screens/Dashboard'
import { useMarketStore } from '@/store/market'
import type { MarketSnapshot } from '@/types'

const BOTTOM_H_KEY = 'nexus_focus_bottom_h'

// Minimal snapshot fixture — the focus pane in the right column only
// renders when the focused instrument has BOTH a row in `snapshots` and
// a known _provenance. Tests that exercise the right pane seed at least
// the first instrument; tests that only exercise the header/watchlist
// can leave snapshots empty.
const mkSnapshot = (instrumentId: string): MarketSnapshot => ({
  instrumentId,
  price: 100,
  bid: 99.5,
  ask: 100.5,
  spread: 1,
  spreadBps: 1,
  change24h: 0.01,
  change24hPct: 1,
  high24h: 110,
  low24h: 90,
  volume24h: 1_000_000,
  openInterest: null,
  fundingRate: null,
  nextFunding: null,
  liquidations24h: null,
  vwap: null,
  _source: 'test',
  _status: 'LIVE',
  _provenance: {
    source: 'test',
    fetchMethod: 'mock',
    latencyMs: 0,
    timestamp: new Date().toISOString(),
    receivedAt: new Date().toISOString(),
  },
  _quality: { completeness: 1, timeliness: 1, accuracy: 1, consistency: 1 },
})

const seedFirstSnapshot = () => {
  const first = useMarketStore.getState().instruments[0]
  useMarketStore.setState({ snapshots: { [first.id]: mkSnapshot(first.id) } })
}

beforeEach(() => {
  useMarketStore.setState({
    snapshots: {},
    quality: {},
    readiness: null,
    signals: [],
    lastRefresh: null,
    selectedInstrumentId: null,
    screen: 'dashboard',
  })
  window.localStorage.removeItem(BOTTOM_H_KEY)
})
afterEach(() => cleanup())

describe('<Dashboard /> — header', () => {
  it('renders the standard ScreenHeader with the initializing badge', () => {
    render(<Dashboard />)
    expect(screen.getByText('Market Dashboard')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-refresh-badge').textContent).toBe('initializing')
    // Without readiness the actions slot is empty.
    expect(screen.queryByTestId('dashboard-readiness-label')).not.toBeInTheDocument()
  })

  it('renders the readiness label when readiness slice is populated', () => {
    useMarketStore.setState({
      readiness: {
        score: 0.8,
        ready: true,
        instrumentCount: 4,
        liveCount: 4,
        avgCompleteness: 0.9,
        avgFreshness: 0.9,
        avgReliability: 0.9,
        issues: [],
      },
    })
    render(<Dashboard />)
    expect(screen.getByTestId('dashboard-readiness-label').textContent).toBe('READY')
  })

  it('flips to NOT READY when readiness.ready is false', () => {
    useMarketStore.setState({
      readiness: {
        score: 0.3,
        ready: false,
        instrumentCount: 4,
        liveCount: 0,
        avgCompleteness: 0.5,
        avgFreshness: 0.5,
        avgReliability: 0.5,
        issues: ['low quality'],
      },
    })
    render(<Dashboard />)
    expect(screen.getByTestId('dashboard-readiness-label').textContent).toBe('NOT READY')
  })
})

describe('<Dashboard /> — KPI strip + watchlist', () => {
  it('renders the KPI strip with instrument count', () => {
    render(<Dashboard />)
    const card = screen.getByText('Instruments').parentElement!
    const total = useMarketStore.getState().instruments.length
    expect(within(card).getByText(String(total))).toBeInTheDocument()
  })

  it('renders one row per instrument in the watchlist table', () => {
    const insts = useMarketStore.getState().instruments
    render(<Dashboard />)
    const table = screen.getByRole('table')
    for (const inst of insts) {
      expect(within(table).getByText(inst.symbol)).toBeInTheDocument()
    }
  })

  it('marks each watchlist row with a stable testid', () => {
    const insts = useMarketStore.getState().instruments
    render(<Dashboard />)
    for (const inst of insts) {
      expect(
        screen.getByTestId(`watchlist-row-${inst.id}`),
      ).toBeInTheDocument()
    }
  })
})

describe('<Dashboard /> — split-view focus pane', () => {
  it('renders a focus pane and falls back to the first instrument when nothing is selected', () => {
    seedFirstSnapshot()
    const first = useMarketStore.getState().instruments[0]
    render(<Dashboard />)
    const pane = screen.getByTestId('focus-pane')
    expect(pane).toBeInTheDocument()
    // The right pane should be marked as focused on the first row.
    expect(
      screen.getByTestId(`watchlist-row-${first.id}`),
    ).toHaveAttribute('data-focused', 'true')
  })

  it('single-click on a watchlist row focuses without changing screen', () => {
    seedFirstSnapshot()
    const insts = useMarketStore.getState().instruments
    const target = insts[1] ?? insts[0]
    render(<Dashboard />)
    fireEvent.click(screen.getByTestId(`watchlist-row-${target.id}`))
    const state = useMarketStore.getState()
    expect(state.selectedInstrumentId).toBe(target.id)
    // Screen stays on dashboard — focusInstrument doesn't navigate.
    expect(state.screen).toBe('dashboard')
    expect(
      screen.getByTestId(`watchlist-row-${target.id}`),
    ).toHaveAttribute('data-focused', 'true')
  })

  it('double-click on a watchlist row navigates to Detail', () => {
    seedFirstSnapshot()
    const target = useMarketStore.getState().instruments[1]
    render(<Dashboard />)
    fireEvent.doubleClick(screen.getByTestId(`watchlist-row-${target.id}`))
    const state = useMarketStore.getState()
    expect(state.screen).toBe('detail')
    expect(state.selectedInstrumentId).toBe(target.id)
  })

  it('"Open Full Detail" button drills into the Detail screen', () => {
    seedFirstSnapshot()
    render(<Dashboard />)
    fireEvent.click(screen.getByRole('button', { name: /Open Full Detail/i }))
    expect(useMarketStore.getState().screen).toBe('detail')
  })

  it('exposes the bottom-panel resize separator in the focus pane', () => {
    seedFirstSnapshot()
    render(<Dashboard />)
    expect(
      screen.getByRole('separator', { name: /Resize stats panel/i }),
    ).toBeInTheDocument()
  })

  it('shows the empty-state placeholder when no focused instrument has a snapshot', () => {
    // No snapshot seeded → focusedSnap is undefined → placeholder.
    render(<Dashboard />)
    expect(
      screen.getByText(/Select an instrument from the watchlist\./i),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('separator', { name: /Resize stats panel/i }),
    ).not.toBeInTheDocument()
  })
})

describe('<Dashboard /> — bottom panel persistence', () => {
  it('reads an initial bottom height from localStorage', () => {
    seedFirstSnapshot()
    window.localStorage.setItem(BOTTOM_H_KEY, '260')
    render(<Dashboard />)
    expect(
      screen.getByRole('separator', { name: /Resize stats panel/i }),
    ).toHaveAttribute('aria-valuenow', '260')
  })

  it('persists the bottom height to localStorage after a keyboard nudge', () => {
    seedFirstSnapshot()
    render(<Dashboard />)
    const sep = screen.getByRole('separator', { name: /Resize stats panel/i })
    fireEvent.keyDown(sep, { key: 'ArrowUp' })
    // Default 180 + 8 = 188
    expect(window.localStorage.getItem(BOTTOM_H_KEY)).toBe('188')
  })
})
