import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { Quality } from '@/ui/screens/Quality'
import { useMarketStore } from '@/store/market'
import type { DataQualityReport } from '@/types'

const report = (over: Partial<DataQualityReport> = {}): DataQualityReport => ({
  instrumentId: 'BTCUSD',
  completeness: 0.9,
  freshness: 0.8,
  reliability: 0.95,
  overallScore: 0.88,
  issues: [],
  _source: 'mock',
  _status: 'LIVE',
  assessedAt: '2026-04-19T10:00:00Z',
  ...over,
})

beforeEach(() => {
  useMarketStore.setState({ quality: {}, readiness: null })
})
afterEach(() => cleanup())

describe('<Quality />', () => {
  it('renders ScreenHeader and the empty-state copy when no reports yet', () => {
    render(<Quality />)
    expect(screen.getByText('Data Quality')).toBeInTheDocument()
    expect(screen.getByText(/Waiting for first data refresh/i)).toBeInTheDocument()
  })

  it('renders the readiness badge driven by the readiness store slice', () => {
    useMarketStore.setState({
      readiness: {
        score: 0.72,
        ready: true,
        instrumentCount: 4,
        liveCount: 3,
        avgCompleteness: 0.9,
        avgFreshness: 0.8,
        avgReliability: 0.85,
        issues: [],
      },
    })
    render(<Quality />)
    const badge = screen.getByTestId('quality-readiness-badge')
    expect(badge.textContent).toMatch(/72% ready/i)
  })

  it('flags not-ready in the badge when score is low', () => {
    useMarketStore.setState({
      readiness: {
        score: 0.3,
        ready: false,
        instrumentCount: 4,
        liveCount: 0,
        avgCompleteness: 0.5,
        avgFreshness: 0.4,
        avgReliability: 0.5,
        issues: ['stale data on BTCUSD'],
      },
    })
    render(<Quality />)
    expect(screen.getByTestId('quality-readiness-badge').textContent).toMatch(/not ready/i)
    // Issues panel renders.
    expect(screen.getByText(/stale data on BTCUSD/i)).toBeInTheDocument()
  })

  it('renders one row per instrument that has a quality report', () => {
    const insts = useMarketStore.getState().instruments
    const first = insts[0]!
    useMarketStore.setState({
      quality: { [first.id]: report({ instrumentId: first.id, overallScore: 0.91 }) },
    })
    render(<Quality />)
    // The instrument symbol shows up in the per-instrument table.
    const table = screen.getByRole('table')
    expect(within(table).getAllByText(first.symbol).length).toBeGreaterThan(0)
  })
})
