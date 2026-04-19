import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { Dashboard } from '@/ui/screens/Dashboard'
import { useMarketStore } from '@/store/market'

beforeEach(() => {
  useMarketStore.setState({
    snapshots: {},
    quality: {},
    readiness: null,
    signals: [],
    lastRefresh: null,
  })
})
afterEach(() => cleanup())

describe('<Dashboard />', () => {
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
})
