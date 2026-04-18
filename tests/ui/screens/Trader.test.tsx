import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { Trader } from '@/ui/screens/Trader'
import { useChainStore } from '@/store/chain'
import { auditLogger } from '@/audit/logger'
import type { PaperOrder } from '@/types/order'
import type { Position } from '@/types/position'

// ─── FIXTURES ───────────────────────────────────────────────
let seq = 0

const order = (over: Partial<PaperOrder> = {}): PaperOrder => ({
  id: `ord_${seq++}`,
  timestamp: 1_700_000_000_000,
  decisionId: 'dec_1',
  sentinelApprovalId: 'ok',
  instrumentId: 'BTCUSD',
  symbol: 'BTC/USD',
  side: 'buy',
  type: 'market',
  size: 0.1,
  price: 60_000,
  slippage: 0.001,
  status: 'filled',
  fillPrice: 60_010,
  fillTime: 1_700_000_000_100,
  pnl: null,
  _source: 'paper_broker',
  _status: 'LIVE',
  ...over,
})

const position = (over: Partial<Position> = {}): Position => ({
  id: `pos_${seq++}`,
  orderId: `ord_${seq}`,
  decisionId: 'dec_1',
  instrumentId: 'BTCUSD',
  symbol: 'BTC/USD',
  side: 'long',
  size: 0.1,
  entryPrice: 60_000,
  stopLoss: 58_000,
  takeProfit: 65_000,
  openedAt: 1_700_000_000_100,
  closedAt: null,
  markPrice: 60_500,
  unrealizedPnl: 50,
  unrealizedPnlPct: 0.0083,
  realizedPnl: null,
  closeReason: null,
  status: 'open',
  _source: 'paper_broker',
  _status: 'LIVE',
  ...over,
})

// ─── STORE RESET ────────────────────────────────────────────
const resetChainStore = () => {
  useChainStore.setState({
    decisions: [],
    orders: [],
    vetos: [],
    positions: [],
    entries: [],
    reviewQueue: [],
    portfolio: {
      openCount: 0,
      grossExposure: 0,
      unrealizedPnl: 0,
      realizedPnl: 0,
    },
    lastOutcome: null,
    lastContextInstrumentId: null,
    safeMode: false,
    autoRun: false,
  })
  auditLogger.clear()
  window.localStorage.clear()
}

beforeEach(() => resetChainStore())
afterEach(() => cleanup())

// ─── HEADER + EMPTY STATES ──────────────────────────────────
describe('<Trader /> empty state', () => {
  it('renders the dry-run subtitle and zero-state copy', () => {
    render(<Trader />)
    expect(screen.getByText(/0 orders · 0 positions · dry-run only/i)).toBeInTheDocument()
    expect(screen.getByText(/no open positions/i)).toBeInTheDocument()
    // Order blotter and closed positions panels collapse to "—".
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2)
    // Fill rate / mean slippage cards show "—" when there's nothing to fill.
    const fillCard = screen.getByText('fill rate').parentElement!
    expect(within(fillCard).getByText('—')).toBeInTheDocument()
  })
})

// ─── PORTFOLIO STAT CARDS ───────────────────────────────────
describe('<Trader /> portfolio stat cards', () => {
  it('reflects portfolio numbers from the store', () => {
    useChainStore.setState({
      portfolio: {
        openCount: 3,
        grossExposure: 1.25,
        unrealizedPnl: 42.5,
        realizedPnl: -15.25,
      },
    })
    render(<Trader />)
    const openCard = screen.getByText('open positions').parentElement!
    expect(within(openCard).getByText('3')).toBeInTheDocument()
    const grossCard = screen.getByText('gross exposure').parentElement!
    expect(within(grossCard).getByText('1.25')).toBeInTheDocument()
    const unrCard = screen.getByText('unrealized PnL').parentElement!
    expect(within(unrCard).getByText('42.50')).toBeInTheDocument()
    const realCard = screen.getByText('realized PnL').parentElement!
    expect(within(realCard).getByText('-15.25')).toBeInTheDocument()
  })
})

// ─── EXECUTION STATS ────────────────────────────────────────
describe('<Trader /> execution stats', () => {
  it('computes fill rate, mean slippage, and rejected count from orders', () => {
    useChainStore.setState({
      orders: [
        order({ status: 'filled', slippage: 0.001 }),
        order({ status: 'filled', slippage: 0.003 }),
        order({ status: 'rejected', slippage: 0 }),
        order({ status: 'rejected', slippage: 0 }),
      ],
    })
    render(<Trader />)
    // 2 filled / 4 total → 50%.
    const fillCard = screen.getByText('fill rate').parentElement!
    expect(within(fillCard).getByText('50%')).toBeInTheDocument()
    expect(within(fillCard).getByText('(2/4)')).toBeInTheDocument()
    // Mean of 0.001 and 0.003 → 0.0020.
    const slipCard = screen.getByText('mean slippage').parentElement!
    expect(within(slipCard).getByText('0.0020')).toBeInTheDocument()
    // 2 rejected.
    const rejCard = screen.getByText('rejected orders').parentElement!
    expect(within(rejCard).getByText('2')).toBeInTheDocument()
  })
})

// ─── OPEN POSITIONS + CLOSE BUTTON ──────────────────────────
describe('<Trader /> open positions table', () => {
  it('renders open positions and hides the closed-positions empty path', () => {
    useChainStore.setState({
      positions: [
        position({ id: 'open_a', symbol: 'BTC/USD' }),
        position({ id: 'open_b', symbol: 'ETH/USD', side: 'short' }),
      ],
    })
    render(<Trader />)
    expect(screen.getByText(/Open positions \(2\)/i)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'close' })).toHaveLength(2)
    // Both symbols rendered.
    expect(screen.getByText('BTC/USD')).toBeInTheDocument()
    expect(screen.getByText('ETH/USD')).toBeInTheDocument()
  })

  it('does not crash when the close button is clicked', () => {
    // The store's closePosition routes through a positionManager singleton
    // that doesn't know about positions we seeded directly via setState, so
    // we can't assert the side-effect here without rebuilding the manager
    // state. This test guards the wiring (button rendered + handler bound)
    // rather than the close logic, which has its own unit tests.
    useChainStore.setState({
      positions: [position({ id: 'pos_close_target', symbol: 'BTC/USD' })],
    })
    render(<Trader />)
    expect(() =>
      fireEvent.click(screen.getByRole('button', { name: 'close' })),
    ).not.toThrow()
  })
})

// ─── CLOSED POSITIONS PANEL ─────────────────────────────────
describe('<Trader /> closed positions panel', () => {
  it('renders the closure breakdown and realized PnL per row', () => {
    useChainStore.setState({
      positions: [
        position({
          id: 'c1',
          status: 'closed',
          closeReason: 'take_profit',
          realizedPnl: 25,
          closedAt: 2,
        }),
        position({
          id: 'c2',
          status: 'closed',
          closeReason: 'take_profit',
          realizedPnl: 30,
          closedAt: 3,
        }),
        position({
          id: 'c3',
          status: 'closed',
          closeReason: 'stop_loss',
          realizedPnl: -10,
          closedAt: 4,
        }),
      ],
    })
    render(<Trader />)
    expect(screen.getByText(/Closed positions \(3\)/i)).toBeInTheDocument()
    // Closure breakdown line: "take_profit 2 · stop_loss 1".
    expect(
      screen.getByText(/take_profit 2.*stop_loss 1/),
    ).toBeInTheDocument()
    // Realized PnL values render with 2-decimal precision.
    expect(screen.getByText('25.00')).toBeInTheDocument()
    expect(screen.getByText('30.00')).toBeInTheDocument()
    expect(screen.getByText('-10.00')).toBeInTheDocument()
  })
})

// ─── ORDER BLOTTER ──────────────────────────────────────────
describe('<Trader /> order blotter', () => {
  it('renders the per-order rows with status colour cues', () => {
    useChainStore.setState({
      orders: [
        order({ id: 'o_filled', status: 'filled' }),
        order({ id: 'o_rejected', status: 'rejected', fillPrice: null }),
      ],
    })
    render(<Trader />)
    expect(screen.getByText(/Order blotter \(2\)/i)).toBeInTheDocument()
    expect(screen.getByText('filled')).toBeInTheDocument()
    expect(screen.getByText('rejected')).toBeInTheDocument()
  })
})
