import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { Correlation } from '@/ui/screens/Correlation'
import { useMarketStore } from '@/store/market'
import type { CorrelationMatrix } from '@/analytics/correlation'

const buildMatrix = (): CorrelationMatrix => ({
  instrumentIds: ['btc', 'eth', 'sol'],
  matrix: [
    [1.0, 0.85, -0.4],
    [0.85, 1.0, -0.2],
    [-0.4, -0.2, 1.0],
  ],
  pairs: [
    { instrumentA: 'btc', instrumentB: 'eth', correlation: 0.85, sampleSize: 50 },
    { instrumentA: 'btc', instrumentB: 'sol', correlation: -0.4, sampleSize: 50 },
    { instrumentA: 'eth', instrumentB: 'sol', correlation: -0.2, sampleSize: 50 },
  ],
  computedAt: '2026-04-19T10:00:00Z',
})

beforeEach(() => useMarketStore.setState({ correlation: null }))
afterEach(() => cleanup())

describe('<Correlation />', () => {
  it('shows the empty state with header chrome when correlation is null', () => {
    render(<Correlation />)
    expect(screen.getByText('Correlation Matrix')).toBeInTheDocument()
    expect(screen.getByText(/Waiting for data to compute correlation matrix/i)).toBeInTheDocument()
    // No badge in the empty branch.
    expect(screen.queryByTestId('correlation-instruments-badge')).not.toBeInTheDocument()
  })

  it('renders the badge with instrument count when matrix is populated', () => {
    useMarketStore.setState({ correlation: buildMatrix() })
    render(<Correlation />)
    expect(screen.getByTestId('correlation-instruments-badge').textContent).toContain('3 instruments')
    expect(screen.getByText('Strongest Correlations')).toBeInTheDocument()
    expect(screen.getByText('Most Decorrelated')).toBeInTheDocument()
  })

  it('renders the legend below the heatmap', () => {
    useMarketStore.setState({ correlation: buildMatrix() })
    render(<Correlation />)
    expect(screen.getByText(/Strong negative/i)).toBeInTheDocument()
    expect(screen.getByText(/Neutral/i)).toBeInTheDocument()
    expect(screen.getByText(/Strong positive/i)).toBeInTheDocument()
  })
})
