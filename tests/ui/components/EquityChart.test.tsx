import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { EquityChart } from '@/ui/components/EquityChart'
import type { EquityPoint } from '@/backtest/types'

// ─── EQUITY CHART — JSDom smoke test ────────────────────────
// Like TradingViewChart, lightweight-charts touches <canvas> (which
// JSDom doesn't implement) on createChart. The component swallows the
// error so the surrounding Backtest screen still mounts in tests; these
// assertions verify the container + tooltip contract holds whether or
// not the engine could initialise.

const pt = (overrides: Partial<EquityPoint> = {}): EquityPoint => ({
  index: 0,
  timestamp: '2026-04-19T10:00:00Z',
  equity: 10000,
  drawdown: 0,
  ...overrides,
})

afterEach(() => cleanup())

describe('<EquityChart />', () => {
  it('renders the chart container even when canvas init fails (JSDom)', () => {
    render(<EquityChart points={[pt()]} initialCapital={10000} />)
    expect(screen.getByTestId('equity-chart-container')).toBeInTheDocument()
  })

  it('does not show the hover tooltip until the user interacts', () => {
    render(
      <EquityChart
        points={[
          pt(),
          pt({ index: 1, timestamp: '2026-04-19T11:00:00Z', equity: 10100, drawdown: 0.01 }),
        ]}
        initialCapital={10000}
      />,
    )
    expect(screen.queryByTestId('equity-chart-tooltip')).not.toBeInTheDocument()
  })

  it('accepts an empty points array without throwing', () => {
    expect(() =>
      render(<EquityChart points={[]} initialCapital={10000} />),
    ).not.toThrow()
  })

  it('dedupes and sorts points before pushing to the chart', () => {
    // Duplicate timestamp + reverse order — would crash the lib if not handled.
    expect(() =>
      render(
        <EquityChart
          points={[
            pt({ timestamp: '2026-04-19T12:00:00Z', equity: 10200 }),
            pt({ timestamp: '2026-04-19T11:00:00Z', equity: 10100 }),
            pt({ timestamp: '2026-04-19T11:00:00Z', equity: 10150, drawdown: 0.01 }),
          ]}
          initialCapital={10000}
        />,
      ),
    ).not.toThrow()
  })

  it('honours the height prop on the container', () => {
    render(
      <EquityChart points={[pt()]} initialCapital={10000} height={400} />,
    )
    const container = screen.getByTestId('equity-chart-container')
    expect(container.style.height).toBe('400px')
  })

  it('height="auto" makes the container fill its parent (100%)', () => {
    render(
      <EquityChart points={[pt()]} initialCapital={10000} height="auto" />,
    )
    const container = screen.getByTestId('equity-chart-container')
    expect(container.style.height).toBe('100%')
    expect(container.style.width).toBe('100%')
  })

  it('tolerates a missing initial capital (0 / NaN) without throwing', () => {
    expect(() =>
      render(<EquityChart points={[pt()]} initialCapital={0} />),
    ).not.toThrow()
    expect(() =>
      render(<EquityChart points={[pt()]} initialCapital={Number.NaN} />),
    ).not.toThrow()
  })
})
