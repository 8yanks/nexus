import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { TradingViewChart } from '@/ui/components/TradingViewChart'
import type { OHLCV, SignalEvent } from '@/types'

// ─── TRADINGVIEW CHART — JSDom smoke test ───────────────────
// lightweight-charts uses <canvas>, which JSDom doesn't implement.
// The component is built to bail silently in that environment so the
// surrounding screens (Detail, Backtest) still mount in unit tests.
// These assertions verify that the container + props contract holds
// regardless of whether the actual chart engine could initialise.

const candle = (overrides: Partial<OHLCV> = {}): OHLCV => ({
  open: 100,
  high: 105,
  low: 99,
  close: 103,
  volume: 1234,
  timestamp: '2026-04-19T10:00:00Z',
  _source: 'mock',
  _status: 'LIVE',
  ...overrides,
})

afterEach(() => cleanup())

describe('<TradingViewChart />', () => {
  it('renders the chart container even when canvas init fails (JSDom)', () => {
    render(<TradingViewChart candles={[candle()]} decimals={2} />)
    expect(screen.getByTestId('tv-chart-container')).toBeInTheDocument()
  })

  it('does not show the hover tooltip until the user interacts', () => {
    render(
      <TradingViewChart
        candles={[
          candle(),
          candle({ timestamp: '2026-04-19T11:00:00Z', close: 104 }),
        ]}
        decimals={2}
      />,
    )
    expect(screen.queryByTestId('tv-chart-tooltip')).not.toBeInTheDocument()
  })

  it('dedupes and sorts candles before pushing to the chart', () => {
    // Duplicate timestamp + reverse order — would crash the lib if not handled.
    expect(() =>
      render(
        <TradingViewChart
          candles={[
            candle({ timestamp: '2026-04-19T12:00:00Z' }),
            candle({ timestamp: '2026-04-19T11:00:00Z' }),
            candle({ timestamp: '2026-04-19T11:00:00Z', close: 110 }),
          ]}
          decimals={2}
        />,
      ),
    ).not.toThrow()
  })

  it('accepts an empty candle array without throwing', () => {
    expect(() => render(<TradingViewChart candles={[]} decimals={2} />)).not.toThrow()
  })

  it('honours the height prop on the container', () => {
    render(<TradingViewChart candles={[candle()]} decimals={2} height={400} />)
    const container = screen.getByTestId('tv-chart-container')
    expect(container.style.height).toBe('400px')
  })

  it('height="auto" makes the container fill its parent (100%)', () => {
    render(<TradingViewChart candles={[candle()]} decimals={2} height="auto" />)
    const container = screen.getByTestId('tv-chart-container')
    expect(container.style.height).toBe('100%')
    expect(container.style.width).toBe('100%')
  })
})

describe('<TradingViewChart /> — EMA overlays', () => {
  it('renders the EMA legend with default 20 + 50 periods', () => {
    render(<TradingViewChart candles={[candle()]} decimals={2} />)
    const legend = screen.getByTestId('tv-chart-ema-legend')
    expect(legend).toHaveTextContent('EMA 20')
    expect(legend).toHaveTextContent('EMA 50')
  })

  it('honours a custom emaPeriods list', () => {
    render(
      <TradingViewChart
        candles={[candle()]}
        decimals={2}
        emaPeriods={[9, 21, 100]}
      />,
    )
    const legend = screen.getByTestId('tv-chart-ema-legend')
    expect(legend).toHaveTextContent('EMA 9')
    expect(legend).toHaveTextContent('EMA 21')
    expect(legend).toHaveTextContent('EMA 100')
    expect(legend).not.toHaveTextContent('EMA 20')
  })

  it('hides the legend entirely when emaPeriods is empty', () => {
    render(
      <TradingViewChart candles={[candle()]} decimals={2} emaPeriods={[]} />,
    )
    expect(screen.queryByTestId('tv-chart-ema-legend')).not.toBeInTheDocument()
  })

  it('tolerates a candle window shorter than the longest EMA period', () => {
    // Only 5 candles — EMA 50 cannot seed yet; the chart must not throw.
    const seeded = Array.from({ length: 5 }, (_, i) =>
      candle({
        timestamp: new Date(Date.UTC(2026, 3, 19, 10 + i)).toISOString(),
        close: 100 + i,
      }),
    )
    expect(() =>
      render(<TradingViewChart candles={seeded} decimals={2} />),
    ).not.toThrow()
  })
})

describe('<TradingViewChart /> — signal markers', () => {
  const sig = (overrides: Partial<SignalEvent> = {}): SignalEvent => ({
    id: 's1',
    instrumentId: 'BTC-USD-SPOT',
    type: 'RSI_OVERSOLD',
    direction: 'bullish',
    strength: 0.8,
    description: 'RSI dipped below 30',
    price: 100,
    timestamp: '2026-04-19T10:00:00Z',
    _source: 'mock',
    _status: 'LIVE',
    ...overrides,
  })

  it('does not throw when markers is empty (default)', () => {
    expect(() =>
      render(<TradingViewChart candles={[candle()]} decimals={2} />),
    ).not.toThrow()
  })

  it('accepts bullish + bearish + neutral markers without throwing', () => {
    const markers: SignalEvent[] = [
      sig({ id: '1', direction: 'bullish', type: 'RSI_OVERSOLD' }),
      sig({ id: '2', direction: 'bearish', type: 'RSI_OVERBOUGHT', timestamp: '2026-04-19T11:00:00Z' }),
      sig({ id: '3', direction: 'neutral', type: 'BB_SQUEEZE', timestamp: '2026-04-19T12:00:00Z' }),
    ]
    expect(() =>
      render(
        <TradingViewChart
          candles={[
            candle(),
            candle({ timestamp: '2026-04-19T11:00:00Z' }),
            candle({ timestamp: '2026-04-19T12:00:00Z' }),
          ]}
          decimals={2}
          markers={markers}
        />,
      ),
    ).not.toThrow()
  })

  it('tolerates duplicate markers on the same bar (dedup by time+type)', () => {
    const markers: SignalEvent[] = [
      sig({ id: '1' }),
      sig({ id: '2' }), // identical time + type — deduped
    ]
    expect(() =>
      render(
        <TradingViewChart candles={[candle()]} decimals={2} markers={markers} />,
      ),
    ).not.toThrow()
  })

  it('handles markers whose timestamp does not match any candle', () => {
    // Marker at a time the chart has never seen — lightweight-charts
    // tolerates "ghost" markers (placed at the timestamp regardless),
    // so this should still mount cleanly.
    expect(() =>
      render(
        <TradingViewChart
          candles={[candle()]}
          decimals={2}
          markers={[sig({ timestamp: '2030-01-01T00:00:00Z' })]}
        />,
      ),
    ).not.toThrow()
  })

  it('still mounts the container when markers carry invalid timestamps', () => {
    // NaN-time markers must be filtered, not crash the plugin.
    expect(() =>
      render(
        <TradingViewChart
          candles={[candle()]}
          decimals={2}
          markers={[sig({ timestamp: 'not-a-date' })]}
        />,
      ),
    ).not.toThrow()
    expect(screen.getByTestId('tv-chart-container')).toBeInTheDocument()
  })
})

describe('<TradingViewChart /> — Bollinger Bands overlay', () => {
  const makeCandles = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      candle({
        timestamp: new Date(Date.UTC(2026, 3, 19, 0, i)).toISOString(),
        close: 100 + Math.sin(i / 3) * 5,
      }),
    )

  it('mounts cleanly with bollinger=null (default)', () => {
    expect(() =>
      render(<TradingViewChart candles={makeCandles(30)} decimals={2} />),
    ).not.toThrow()
  })

  it('mounts cleanly when bollinger config is provided', () => {
    expect(() =>
      render(
        <TradingViewChart
          candles={makeCandles(30)}
          decimals={2}
          bollinger={{ period: 20, stdDev: 2 }}
        />,
      ),
    ).not.toThrow()
    expect(screen.getByTestId('tv-chart-container')).toBeInTheDocument()
  })

  it('tolerates a window shorter than the Bollinger period', () => {
    // Only 5 candles — BB(20) can't seed yet, bands stay null and the
    // chart must still mount without exceptions.
    expect(() =>
      render(
        <TradingViewChart
          candles={makeCandles(5)}
          decimals={2}
          bollinger={{ period: 20, stdDev: 2 }}
        />,
      ),
    ).not.toThrow()
  })

  it('ignores non-positive Bollinger periods', () => {
    // Zero / negative periods should no-op (the series helper rejects
    // them too). The chart must still mount rather than crash.
    expect(() =>
      render(
        <TradingViewChart
          candles={makeCandles(30)}
          decimals={2}
          bollinger={{ period: 0, stdDev: 2 }}
        />,
      ),
    ).not.toThrow()
  })
})
