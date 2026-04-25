import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { Detail } from '@/ui/screens/Detail'
import { useMarketStore } from '@/store/market'
import { TIMEFRAME_STORAGE_KEY } from '@/ui/timeframe-memory'
import type { CandleSeries, MarketSnapshot, OHLCV } from '@/types'
import { DEFAULT_CONFIG, type BacktestResult } from '@/backtest/types'

const snap = (id: string, over: Partial<MarketSnapshot> = {}): MarketSnapshot => ({
  instrumentId: id,
  price: 60_000,
  bid: 59_999,
  ask: 60_001,
  spread: 2,
  spreadBps: 0.33,
  change24h: 250,
  change24hPct: 0.42,
  high24h: 61_000,
  low24h: 58_000,
  volume24h: 1_000,
  openInterest: null,
  fundingRate: null,
  nextFunding: null,
  liquidations24h: null,
  vwap: 60_100,
  _source: 'mock',
  _status: 'LIVE',
  _provenance: {
    source: 'mock',
    fetchMethod: 'mock',
    latencyMs: null,
    timestamp: '2026-04-19T10:00:00Z',
    receivedAt: '2026-04-19T10:00:00Z',
  },
  _quality: { completeness: 1, timeliness: 1, accuracy: 1, consistency: 1 },
  ...over,
})

// Build a synthetic 30-candle window for the chart branch (chart only
// renders when chartCandles.length > 2; 30 keeps us well above that and
// gives BB(20) enough history to seed if the test needs it).
const mkCandles = (instrumentId: string): CandleSeries => {
  const bars: OHLCV[] = Array.from({ length: 30 }, (_, i) => ({
    open: 60_000 + i,
    high: 60_100 + i,
    low: 59_900 + i,
    close: 60_050 + i,
    volume: 1_000,
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
      timestamp: '2026-04-19T10:00:00Z',
      receivedAt: '2026-04-19T10:00:00Z',
    },
    generatedAt: '2026-04-19T10:00:00Z',
  }
}

beforeEach(() => {
  useMarketStore.setState({
    selectedInstrumentId: null,
    snapshots: {},
    candles: {},
    selectedTimeframe: '1h',
    backtestResults: {},
  })
  // Detail persists the BB / DC / BT toggles + timeframe to
  // localStorage — clear between tests so state from one test doesn't
  // leak into the next.
  try {
    window.localStorage.removeItem('nexus_detail_bb_overlay')
    window.localStorage.removeItem('nexus_detail_dc_overlay')
    window.localStorage.removeItem('nexus_detail_bt_overlay')
    window.localStorage.removeItem(TIMEFRAME_STORAGE_KEY)
  } catch {
    /* storage disabled */
  }
})

const mkBacktestResult = (instrumentId: string, tradeCount = 2): BacktestResult => ({
  config: { ...DEFAULT_CONFIG, instrumentId },
  trades: Array.from({ length: tradeCount }, (_, i) => ({
    id: i,
    direction: 'long' as const,
    entryIndex: i,
    entryPrice: 100,
    entryTimestamp: new Date(Date.UTC(2026, 3, 19, i)).toISOString(),
    entrySignal: 'RSI_OVERSOLD',
    exitIndex: i + 5,
    exitPrice: 110,
    exitTimestamp: new Date(Date.UTC(2026, 3, 19, i + 5)).toISOString(),
    exitReason: 'take_profit' as const,
    pnl: 100, pnlPct: 0.1, commission: 0.2, bars: 5,
    maxFavorable: 0.12, maxAdverse: 0.01,
  })),
  events: [], equity: [],
  stats: {
    totalTrades: tradeCount, winningTrades: tradeCount, losingTrades: 0, winRate: 1,
    grossProfit: 100 * tradeCount, grossLoss: 0, netProfit: 100 * tradeCount,
    profitFactor: Infinity, maxDrawdown: 0, maxDrawdownAmount: 0, sharpeRatio: 1,
    avgWin: 100, avgLoss: 0, avgBars: 5, expectancy: 100,
    totalCommission: 0.2 * tradeCount, finalEquity: 10_000 + 100 * tradeCount,
    totalReturn: (100 * tradeCount) / 10_000,
  },
  startTimestamp: '2026-04-19T00:00:00Z',
  endTimestamp: '2026-04-19T23:00:00Z',
  candleCount: 200,
})
afterEach(() => cleanup())

describe('<Detail />', () => {
  it('shows the no-instrument empty state when nothing selected', () => {
    render(<Detail />)
    expect(screen.getByText(/No instrument selected/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Back to Dashboard/i })).toBeInTheDocument()
  })

  it('renders the dynamic ScreenHeader (symbol + back button) for the selected instrument', () => {
    const inst = useMarketStore.getState().instruments[0]!
    useMarketStore.setState({
      selectedInstrumentId: inst.id,
      snapshots: { [inst.id]: snap(inst.id) },
    })
    render(<Detail />)
    // Header title is the symbol.
    expect(screen.getByRole('heading', { name: inst.symbol })).toBeInTheDocument()
    // Back button in actions slot.
    expect(screen.getByTitle(/Back to Dashboard/i)).toBeInTheDocument()
  })

  it('back button routes to dashboard via setScreen', () => {
    const inst = useMarketStore.getState().instruments[0]!
    useMarketStore.setState({
      selectedInstrumentId: inst.id,
      snapshots: { [inst.id]: snap(inst.id) },
      screen: 'detail',
    })
    render(<Detail />)
    fireEvent.click(screen.getByTitle(/Back to Dashboard/i))
    expect(useMarketStore.getState().screen).toBe('dashboard')
  })
})

describe('<Detail /> — Bollinger Bands toggle', () => {
  const seedWithCandles = () => {
    const inst = useMarketStore.getState().instruments[0]!
    useMarketStore.setState({
      selectedInstrumentId: inst.id,
      snapshots: { [inst.id]: snap(inst.id) },
      candles: { [inst.id]: mkCandles(inst.id) },
    })
    return inst
  }

  it('exposes a BB toggle button in the chart toolbar', () => {
    seedWithCandles()
    render(<Detail />)
    expect(screen.getByTestId('detail-bb-toggle')).toBeInTheDocument()
  })

  it('BB toggle starts unpressed by default', () => {
    seedWithCandles()
    render(<Detail />)
    expect(screen.getByTestId('detail-bb-toggle').getAttribute('aria-pressed')).toBe('false')
  })

  it('clicking the BB toggle flips aria-pressed', () => {
    seedWithCandles()
    render(<Detail />)
    const btn = screen.getByTestId('detail-bb-toggle')
    fireEvent.click(btn)
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(btn)
    expect(btn.getAttribute('aria-pressed')).toBe('false')
  })

  it('persists the BB toggle to localStorage so the preference survives remounts', () => {
    seedWithCandles()
    const { unmount } = render(<Detail />)
    fireEvent.click(screen.getByTestId('detail-bb-toggle'))
    expect(window.localStorage.getItem('nexus_detail_bb_overlay')).toBe('1')
    unmount()
    // Remount — stored preference should be read back.
    render(<Detail />)
    expect(screen.getByTestId('detail-bb-toggle').getAttribute('aria-pressed')).toBe('true')
  })

  it('hides the toolbar when the chart branch is not rendered (insufficient candles)', () => {
    const inst = useMarketStore.getState().instruments[0]!
    useMarketStore.setState({
      selectedInstrumentId: inst.id,
      snapshots: { [inst.id]: snap(inst.id) },
      candles: {},
    })
    render(<Detail />)
    expect(screen.queryByTestId('detail-bb-toggle')).not.toBeInTheDocument()
  })
})

describe('<Detail /> — Donchian Channels toggle', () => {
  const seedWithCandles = () => {
    const inst = useMarketStore.getState().instruments[0]!
    useMarketStore.setState({
      selectedInstrumentId: inst.id,
      snapshots: { [inst.id]: snap(inst.id) },
      candles: { [inst.id]: mkCandles(inst.id) },
    })
    return inst
  }

  it('exposes a DC toggle button alongside the BB toggle', () => {
    seedWithCandles()
    render(<Detail />)
    expect(screen.getByTestId('detail-dc-toggle')).toBeInTheDocument()
    expect(screen.getByTestId('detail-bb-toggle')).toBeInTheDocument()
  })

  it('DC toggle starts unpressed by default', () => {
    seedWithCandles()
    render(<Detail />)
    expect(screen.getByTestId('detail-dc-toggle').getAttribute('aria-pressed')).toBe('false')
  })

  it('clicking the DC toggle flips aria-pressed', () => {
    seedWithCandles()
    render(<Detail />)
    const btn = screen.getByTestId('detail-dc-toggle')
    fireEvent.click(btn)
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(btn)
    expect(btn.getAttribute('aria-pressed')).toBe('false')
  })

  it('persists the DC toggle to localStorage independently of BB', () => {
    seedWithCandles()
    const { unmount } = render(<Detail />)
    fireEvent.click(screen.getByTestId('detail-dc-toggle'))
    expect(window.localStorage.getItem('nexus_detail_dc_overlay')).toBe('1')
    // BB stays off — the two toggles must not bleed into each other.
    expect(window.localStorage.getItem('nexus_detail_bb_overlay')).not.toBe('1')
    unmount()
    render(<Detail />)
    expect(screen.getByTestId('detail-dc-toggle').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('detail-bb-toggle').getAttribute('aria-pressed')).toBe('false')
  })

  it('both toggles can be on at the same time', () => {
    seedWithCandles()
    render(<Detail />)
    fireEvent.click(screen.getByTestId('detail-bb-toggle'))
    fireEvent.click(screen.getByTestId('detail-dc-toggle'))
    expect(screen.getByTestId('detail-bb-toggle').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('detail-dc-toggle').getAttribute('aria-pressed')).toBe('true')
  })
})

describe('<Detail /> — backtest markers toggle', () => {
  const seedWithCandles = () => {
    const inst = useMarketStore.getState().instruments[0]!
    useMarketStore.setState({
      selectedInstrumentId: inst.id,
      snapshots: { [inst.id]: snap(inst.id) },
      candles: { [inst.id]: mkCandles(inst.id) },
    })
    return inst
  }

  it('hides the BT toggle entirely when no backtest result exists for the instrument', () => {
    seedWithCandles()
    render(<Detail />)
    expect(screen.queryByTestId('detail-bt-toggle')).not.toBeInTheDocument()
  })

  it('shows the BT toggle with trade count when a result is in the store', () => {
    const inst = seedWithCandles()
    useMarketStore.setState({
      backtestResults: { [inst.id]: mkBacktestResult(inst.id, 4) },
    })
    render(<Detail />)
    const btn = screen.getByTestId('detail-bt-toggle')
    expect(btn).toBeInTheDocument()
    expect(btn.textContent).toMatch(/BT 4/)
  })

  it('BT toggle starts unpressed', () => {
    const inst = seedWithCandles()
    useMarketStore.setState({
      backtestResults: { [inst.id]: mkBacktestResult(inst.id) },
    })
    render(<Detail />)
    expect(screen.getByTestId('detail-bt-toggle').getAttribute('aria-pressed')).toBe('false')
  })

  it('clicking BT flips aria-pressed and persists the choice', () => {
    const inst = seedWithCandles()
    useMarketStore.setState({
      backtestResults: { [inst.id]: mkBacktestResult(inst.id) },
    })
    render(<Detail />)
    const btn = screen.getByTestId('detail-bt-toggle')
    fireEvent.click(btn)
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    expect(window.localStorage.getItem('nexus_detail_bt_overlay')).toBe('1')
  })

  it('BT pill ONLY appears for the instrument that was backtested', () => {
    const instA = useMarketStore.getState().instruments[0]!
    const instB = useMarketStore.getState().instruments[1]!
    useMarketStore.setState({
      selectedInstrumentId: instB.id,           // currently viewing B
      snapshots: { [instB.id]: snap(instB.id) },
      candles: { [instB.id]: mkCandles(instB.id) },
      backtestResults: { [instA.id]: mkBacktestResult(instA.id) }, // backtest only for A
    })
    render(<Detail />)
    expect(screen.queryByTestId('detail-bt-toggle')).not.toBeInTheDocument()
  })
})

describe('<Detail /> — timeframe picker', () => {
  const seedWithCandles = () => {
    const inst = useMarketStore.getState().instruments[0]!
    useMarketStore.setState({
      selectedInstrumentId: inst.id,
      snapshots: { [inst.id]: snap(inst.id) },
      candles: { [inst.id]: mkCandles(inst.id) },
      // Stub refreshAll so clicks don't trigger network/state churn.
      refreshAll: vi.fn().mockResolvedValue(undefined) as never,
    })
    return inst
  }

  it('renders all six timeframe pills in the toolbar', () => {
    seedWithCandles()
    render(<Detail />)
    for (const tf of ['1m', '5m', '15m', '1h', '4h', '1d']) {
      expect(screen.getByTestId(`detail-tf-${tf}`)).toBeInTheDocument()
    }
  })

  it('highlights the active timeframe via aria-pressed', () => {
    seedWithCandles()
    render(<Detail />)
    expect(screen.getByTestId('detail-tf-1h').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('detail-tf-5m').getAttribute('aria-pressed')).toBe('false')
  })

  it('clicking a non-active pill updates the store + flips aria-pressed', () => {
    seedWithCandles()
    render(<Detail />)
    fireEvent.click(screen.getByTestId('detail-tf-5m'))
    expect(useMarketStore.getState().selectedTimeframe).toBe('5m')
    // After re-render the new pill is active.
    expect(screen.getByTestId('detail-tf-5m').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('detail-tf-1h').getAttribute('aria-pressed')).toBe('false')
  })

  it('persists the selected timeframe to localStorage', () => {
    seedWithCandles()
    render(<Detail />)
    fireEvent.click(screen.getByTestId('detail-tf-15m'))
    expect(window.localStorage.getItem(TIMEFRAME_STORAGE_KEY)).toBe(JSON.stringify('15m'))
  })

  it('clicking a non-active pill triggers refreshAll exactly once', () => {
    seedWithCandles()
    render(<Detail />)
    const refreshAll = useMarketStore.getState().refreshAll as unknown as ReturnType<typeof vi.fn>
    fireEvent.click(screen.getByTestId('detail-tf-4h'))
    expect(refreshAll).toHaveBeenCalledTimes(1)
  })

  it('clicking the active pill is a no-op (no refresh, no storage write)', () => {
    seedWithCandles()
    render(<Detail />)
    const refreshAll = useMarketStore.getState().refreshAll as unknown as ReturnType<typeof vi.fn>
    fireEvent.click(screen.getByTestId('detail-tf-1h')) // already active
    expect(refreshAll).not.toHaveBeenCalled()
    expect(window.localStorage.getItem(TIMEFRAME_STORAGE_KEY)).toBeNull()
  })

  // ── Keyboard shortcuts ───────────────────────────────────
  it('pressing "1" switches the active timeframe to 1m', () => {
    seedWithCandles()
    render(<Detail />)
    fireEvent.keyDown(window, { key: '1' })
    expect(useMarketStore.getState().selectedTimeframe).toBe('1m')
  })

  it('pressing "h" switches the active timeframe to 1h', () => {
    const inst = seedWithCandles()
    useMarketStore.setState({ selectedTimeframe: '5m', selectedInstrumentId: inst.id })
    render(<Detail />)
    fireEvent.keyDown(window, { key: 'h' })
    expect(useMarketStore.getState().selectedTimeframe).toBe('1h')
  })

  it('pressing "q" switches to 15m (the only TF without a single-digit key)', () => {
    seedWithCandles()
    render(<Detail />)
    fireEvent.keyDown(window, { key: 'q' })
    expect(useMarketStore.getState().selectedTimeframe).toBe('15m')
  })

  it('pressing an unknown key does not change the timeframe', () => {
    seedWithCandles()
    render(<Detail />)
    fireEvent.keyDown(window, { key: 'a' })
    expect(useMarketStore.getState().selectedTimeframe).toBe('1h')
  })

  it('pressing "1" with ctrl held does not change the timeframe', () => {
    seedWithCandles()
    render(<Detail />)
    fireEvent.keyDown(window, { key: '1', ctrlKey: true })
    expect(useMarketStore.getState().selectedTimeframe).toBe('1h')
  })

  it('removes the keydown listener on unmount (no leak)', () => {
    seedWithCandles()
    const { unmount } = render(<Detail />)
    unmount()
    fireEvent.keyDown(window, { key: '5' })
    // After unmount, no Detail listener is left to react. The store
    // stays untouched (still on the seeded '1h' default).
    expect(useMarketStore.getState().selectedTimeframe).toBe('1h')
  })
})
