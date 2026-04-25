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
