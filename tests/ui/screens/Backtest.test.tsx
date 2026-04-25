import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import { Backtest } from '@/ui/screens/Backtest'
import { useMarketStore } from '@/store/market'
import { DEFAULT_CONFIG } from '@/backtest/types'
import { BACKTEST_CONFIG_STORAGE_KEY } from '@/backtest/config-memory'
import * as engineModule from '@/backtest/engine'
import type { CandleSeries, OHLCV } from '@/types'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  try {
    window.localStorage.removeItem(BACKTEST_CONFIG_STORAGE_KEY)
  } catch {
    /* storage disabled */
  }
})

describe('<Backtest />', () => {
  it('renders the standard ScreenHeader with the idle badge by default', () => {
    render(<Backtest />)
    expect(screen.getByText('Backtest Engine')).toBeInTheDocument()
    expect(screen.getByTestId('backtest-state-badge').textContent).toBe('idle')
  })

  it('exposes a Run Backtest button in the config panel', () => {
    render(<Backtest />)
    expect(screen.getByRole('button', { name: /Run Backtest/i })).toBeInTheDocument()
  })
})

// ─── Store integration — Detail screen surfaces these results ────────
// Run handler must call `setBacktestResult` after a successful run so
// the Detail screen can overlay trade markers on the live chart.

describe('<Backtest /> — store integration', () => {
  const mkCandles = (instrumentId: string): CandleSeries => {
    const bars: OHLCV[] = Array.from({ length: 60 }, (_, i) => ({
      open: 100 + i,
      high: 105 + i,
      low: 95 + i,
      close: 102 + i,
      volume: 1000,
      timestamp: new Date(Date.UTC(2026, 3, 19, i)).toISOString(),
      _source: 'mock',
      _status: 'LIVE',
    }))
    return {
      instrumentId,
      timeframe: '1h',
      candles: bars,
      _source: 'mock',
      _status: 'LIVE',
      _provenance: {
        source: 'mock',
        fetchMethod: 'mock',
        latencyMs: null,
        timestamp: '2026-04-19T00:00:00Z',
        receivedAt: '2026-04-19T00:00:00Z',
      },
      generatedAt: '2026-04-19T00:00:00Z',
    }
  }

  beforeEach(() => {
    useMarketStore.setState({
      candles: { [DEFAULT_CONFIG.instrumentId]: mkCandles(DEFAULT_CONFIG.instrumentId) },
      backtestResults: {},
    })
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('pushes the result to the store after a successful run', () => {
    // Stub the engine so the test stays fast + deterministic.
    const fakeResult = {
      config: { ...DEFAULT_CONFIG },
      trades: [{ id: 0, direction: 'long' as const, entryIndex: 0, entryPrice: 100, entryTimestamp: '', entrySignal: 'RSI_OVERSOLD', exitIndex: 5, exitPrice: 110, exitTimestamp: '', exitReason: 'take_profit' as const, pnl: 100, pnlPct: 0.1, commission: 0.2, bars: 5, maxFavorable: 0.12, maxAdverse: 0.01 }],
      events: [],
      equity: [],
      stats: { totalTrades: 1, winningTrades: 1, losingTrades: 0, winRate: 1, grossProfit: 100, grossLoss: 0, netProfit: 100, profitFactor: Infinity, maxDrawdown: 0, maxDrawdownAmount: 0, sharpeRatio: 1, avgWin: 100, avgLoss: 0, avgBars: 5, expectancy: 100, totalCommission: 0.2, finalEquity: 10_100, totalReturn: 0.01 },
      startTimestamp: '', endTimestamp: '', candleCount: 60,
    }
    vi.spyOn(engineModule, 'runBacktest').mockReturnValue(fakeResult)

    render(<Backtest />)
    fireEvent.click(screen.getByRole('button', { name: /Run Backtest/i }))
    // The handler defers the actual run via setTimeout(..., 0) so the
    // "running…" badge can paint first. Flush the timer.
    act(() => {
      vi.runAllTimers()
    })

    const stored = useMarketStore.getState().backtestResults[DEFAULT_CONFIG.instrumentId]
    expect(stored).toBe(fakeResult)
  })

  it('persists the config to localStorage on every config change', () => {
    render(<Backtest />)
    // Initial mount writes the loaded-or-default config (the
    // useEffect fires on first render). Verify it landed in storage.
    const raw = window.localStorage.getItem(BACKTEST_CONFIG_STORAGE_KEY)
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed).toMatchObject({
      instrumentId: DEFAULT_CONFIG.instrumentId,
      stopLoss: DEFAULT_CONFIG.stopLoss,
    })
  })
})

// ─── "View on chart" button — closes the loop with Detail ────────
describe('<Backtest /> — view on chart navigation', () => {
  const mkCandles = (instrumentId: string): CandleSeries => ({
    instrumentId,
    timeframe: '1h',
    candles: Array.from({ length: 60 }, (_, i) => ({
      open: 100 + i, high: 105 + i, low: 95 + i, close: 102 + i,
      volume: 1000,
      timestamp: new Date(Date.UTC(2026, 3, 19, i)).toISOString(),
      _source: 'mock', _status: 'LIVE' as const,
    })),
    _source: 'mock', _status: 'LIVE',
    _provenance: { source: 'mock', fetchMethod: 'mock', latencyMs: null, timestamp: '', receivedAt: '' },
    generatedAt: '',
  })

  beforeEach(() => {
    useMarketStore.setState({
      candles: { [DEFAULT_CONFIG.instrumentId]: mkCandles(DEFAULT_CONFIG.instrumentId) },
      backtestResults: {},
    })
    window.localStorage.removeItem('nexus_detail_bt_overlay')
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const seedResult = (instrumentId: string, tradeCount = 0) => {
    const fakeResult = {
      config: { ...DEFAULT_CONFIG, instrumentId },
      trades: Array.from({ length: tradeCount }, (_, i) => ({
        id: i,
        direction: 'long' as const,
        entryIndex: i, entryPrice: 100,
        entryTimestamp: '', entrySignal: 'RSI_OVERSOLD',
        exitIndex: i + 5, exitPrice: 110,
        exitTimestamp: '', exitReason: 'take_profit' as const,
        pnl: 100, pnlPct: 0.1, commission: 0.2, bars: 5,
        maxFavorable: 0.12, maxAdverse: 0.01,
      })),
      events: [],
      equity: [],
      stats: {
        totalTrades: tradeCount, winningTrades: tradeCount, losingTrades: 0, winRate: tradeCount > 0 ? 1 : 0,
        grossProfit: 100 * tradeCount, grossLoss: 0, netProfit: 100 * tradeCount,
        profitFactor: Infinity,
        maxDrawdown: 0, maxDrawdownAmount: 0, sharpeRatio: 0,
        avgWin: 100, avgLoss: 0, avgBars: 5, expectancy: 100,
        totalCommission: 0.2 * tradeCount, finalEquity: 10_000 + 100 * tradeCount, totalReturn: 0,
      },
      startTimestamp: '', endTimestamp: '', candleCount: 60,
    }
    vi.spyOn(engineModule, 'runBacktest').mockReturnValue(fakeResult)
  }

  it('shows the "view on chart" button only after a result exists', () => {
    seedResult(DEFAULT_CONFIG.instrumentId)
    render(<Backtest />)
    // No result yet → no button.
    expect(screen.queryByTestId('backtest-view-on-chart')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Run Backtest/i }))
    act(() => { vi.runAllTimers() })
    expect(screen.getByTestId('backtest-view-on-chart')).toBeInTheDocument()
  })

  it('clicking "view on chart" navigates to Detail for the backtested instrument', () => {
    seedResult(DEFAULT_CONFIG.instrumentId)
    render(<Backtest />)
    fireEvent.click(screen.getByRole('button', { name: /Run Backtest/i }))
    act(() => { vi.runAllTimers() })
    fireEvent.click(screen.getByTestId('backtest-view-on-chart'))
    expect(useMarketStore.getState().screen).toBe('detail')
    expect(useMarketStore.getState().selectedInstrumentId).toBe(DEFAULT_CONFIG.instrumentId)
  })

  it('clicking "view on chart" pre-flips the Detail BT toggle so markers show by default', () => {
    seedResult(DEFAULT_CONFIG.instrumentId)
    render(<Backtest />)
    fireEvent.click(screen.getByRole('button', { name: /Run Backtest/i }))
    act(() => { vi.runAllTimers() })
    fireEvent.click(screen.getByTestId('backtest-view-on-chart'))
    expect(window.localStorage.getItem('nexus_detail_bt_overlay')).toBe('1')
  })

  it('exposes a CSV export button only when the run produced trades', () => {
    // Empty-trades result first — the table renders but the button hides.
    const emptyResult = {
      config: { ...DEFAULT_CONFIG },
      trades: [],
      events: [], equity: [],
      stats: {
        totalTrades: 0, winningTrades: 0, losingTrades: 0, winRate: 0,
        grossProfit: 0, grossLoss: 0, netProfit: 0, profitFactor: Infinity,
        maxDrawdown: 0, maxDrawdownAmount: 0, sharpeRatio: 0,
        avgWin: 0, avgLoss: 0, avgBars: 0, expectancy: 0,
        totalCommission: 0, finalEquity: 10_000, totalReturn: 0,
      },
      startTimestamp: '', endTimestamp: '', candleCount: 60,
    }
    vi.spyOn(engineModule, 'runBacktest').mockReturnValue(emptyResult)
    render(<Backtest />)
    fireEvent.click(screen.getByRole('button', { name: /Run Backtest/i }))
    act(() => { vi.runAllTimers() })
    expect(screen.queryByTestId('backtest-export-trades-csv')).not.toBeInTheDocument()
  })

  it('CSV button appears once the result has at least one trade', () => {
    seedResult(DEFAULT_CONFIG.instrumentId, 2)
    render(<Backtest />)
    fireEvent.click(screen.getByRole('button', { name: /Run Backtest/i }))
    act(() => { vi.runAllTimers() })
    expect(screen.getByTestId('backtest-export-trades-csv')).toBeInTheDocument()
  })
})

// ─── Recent backtests bar — flip between stored runs ─────────────
describe('<Backtest /> — recent results bar', () => {
  const mkResult = (instrumentId: string, totalReturn = 0.05) => ({
    config: { ...DEFAULT_CONFIG, instrumentId },
    trades: [],
    events: [],
    equity: [],
    stats: {
      totalTrades: 1, winningTrades: 1, losingTrades: 0, winRate: 1,
      grossProfit: 100, grossLoss: 0, netProfit: 100,
      profitFactor: Infinity, maxDrawdown: 0, maxDrawdownAmount: 0,
      sharpeRatio: 1, avgWin: 100, avgLoss: 0, avgBars: 5, expectancy: 100,
      totalCommission: 0.2, finalEquity: 10_500, totalReturn,
    },
    startTimestamp: '', endTimestamp: '', candleCount: 60,
  })

  beforeEach(() => {
    useMarketStore.setState({ backtestResults: {} })
  })

  it('does not render the recent-bar when 0 stored results', () => {
    useMarketStore.setState({ backtestResults: {} })
    render(<Backtest />)
    expect(screen.queryByTestId('backtest-recent-bar')).not.toBeInTheDocument()
  })

  it('does not render the recent-bar when only 1 stored result (no value)', () => {
    useMarketStore.setState({
      backtestResults: { 'BTC-USD-SPOT': mkResult('BTC-USD-SPOT') },
    })
    render(<Backtest />)
    expect(screen.queryByTestId('backtest-recent-bar')).not.toBeInTheDocument()
  })

  it('renders one chip per stored result when there are >= 2', () => {
    useMarketStore.setState({
      backtestResults: {
        'BTC-USD-SPOT': mkResult('BTC-USD-SPOT'),
        'ETH-USD-SPOT': mkResult('ETH-USD-SPOT'),
      },
    })
    render(<Backtest />)
    expect(screen.getByTestId('backtest-recent-bar')).toBeInTheDocument()
    expect(screen.getByTestId('backtest-recent-chip-BTC-USD-SPOT')).toBeInTheDocument()
    expect(screen.getByTestId('backtest-recent-chip-ETH-USD-SPOT')).toBeInTheDocument()
  })

  it('shows return % per chip with sign', () => {
    useMarketStore.setState({
      backtestResults: {
        'BTC-USD-SPOT': mkResult('BTC-USD-SPOT', 0.07),
        'ETH-USD-SPOT': mkResult('ETH-USD-SPOT', -0.03),
      },
    })
    render(<Backtest />)
    const btc = screen.getByTestId('backtest-recent-chip-BTC-USD-SPOT')
    const eth = screen.getByTestId('backtest-recent-chip-ETH-USD-SPOT')
    expect(btc.textContent).toMatch(/\+7\.0%/)
    expect(eth.textContent).toMatch(/-3\.0%/)
  })
})
