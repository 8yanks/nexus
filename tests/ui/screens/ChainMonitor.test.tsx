import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { ChainMonitor } from '@/ui/screens/ChainMonitor'
import { useChainStore } from '@/store/chain'
import { auditLogger } from '@/audit/logger'
import type { TradeDecision, SentinelVeto } from '@/types/decision'
import type { PaperOrder } from '@/types/order'
import type { Position } from '@/types/position'

// ─── FIXTURES ───────────────────────────────────────────────
const decision = (over: Partial<TradeDecision> = {}): TradeDecision => ({
  id: 'dec_1',
  timestamp: 1_700_000_000_000,
  instrumentId: 'BTCUSD',
  symbol: 'BTC/USD',
  action: 'BUY',
  size: 0.1,
  entryPrice: 60_000,
  stopLoss: 58_000,
  takeProfit: 65_000,
  confidence: 0.72,
  riskLevel: 'medium',
  horizon: 'intraday',
  thesis: 'unique-thesis-marker-for-test',
  keyFactors: ['ema'],
  invalidators: ['stop'],
  requiresHumanReview: false,
  modelSource: 'mock',
  consensusScore: null,
  _source: 'ai_orchestrator',
  _status: 'LIVE',
  _contextHash: 'h',
  ...over,
})

// ─── STORE RESET ────────────────────────────────────────────
// The chain store is a singleton. Before each test we reset decisions/
// orders/positions/vetos and clear the audit logger so tests don't leak.
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
}

beforeEach(() => resetChainStore())
afterEach(() => cleanup())

// ─── TESTS ──────────────────────────────────────────────────
describe('<ChainMonitor /> decision drilldown wiring', () => {
  it('opens the drilldown modal when a decision row is clicked', () => {
    useChainStore.setState({ decisions: [decision()] })
    render(<ChainMonitor />)

    // Row is visible, modal is not.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('unique-thesis-marker-for-test')).not.toBeInTheDocument()

    // Click the row — we can find it by its "BUY" cell.
    fireEvent.click(screen.getByText('BUY'))

    // Modal is now open and the full thesis renders inside it.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('unique-thesis-marker-for-test')).toBeInTheDocument()
  })

  it('closes the modal when the close button is pressed', () => {
    useChainStore.setState({ decisions: [decision()] })
    render(<ChainMonitor />)

    fireEvent.click(screen.getByText('BUY'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Close'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the correlated veto + orders + position inside the modal', () => {
    const d = decision({ id: 'correlated' })
    const veto: SentinelVeto = {
      id: 'v1',
      timestamp: 1,
      decisionId: 'correlated',
      approved: false,
      vetoReasons: ['DATA_TOO_OLD'],
      riskMetrics: {
        currentDrawdown: 0,
        maxDrawdownLimit: 0.1,
        currentExposure: 0,
        maxExposureLimit: 1,
        dataQualityScore: 1,
        minDataQuality: 0.5,
        latencyMs: 10,
        maxLatencyMs: 500,
        brokerAvailable: true,
      },
      safeMode: false,
      _source: 'sentinel_engine',
    }
    const order: PaperOrder = {
      id: 'o1',
      timestamp: 1,
      decisionId: 'correlated',
      sentinelApprovalId: 'ok',
      instrumentId: 'BTCUSD',
      symbol: 'BTC/USD',
      side: 'buy',
      type: 'market',
      size: 0.1,
      price: 60_000,
      slippage: 0,
      status: 'filled',
      fillPrice: 60_010,
      fillTime: 2,
      pnl: null,
      _source: 'paper_broker',
      _status: 'LIVE',
    }
    const position: Position = {
      id: 'p1',
      orderId: 'o1',
      decisionId: 'correlated',
      instrumentId: 'BTCUSD',
      symbol: 'BTC/USD',
      side: 'long',
      size: 0.1,
      entryPrice: 60_010,
      stopLoss: 58_000,
      takeProfit: 65_000,
      openedAt: 2,
      closedAt: null,
      markPrice: 60_050,
      unrealizedPnl: 4,
      unrealizedPnlPct: 0.0066,
      realizedPnl: null,
      closeReason: null,
      status: 'open',
      _source: 'paper_broker',
      _status: 'LIVE',
    }
    useChainStore.setState({
      decisions: [d],
      vetos: [veto],
      orders: [order],
      positions: [position],
    })
    render(<ChainMonitor />)

    // Click the "Recent decisions" row — multiple BUY labels exist on the
    // page (positions, orders, decisions), so scope to the panel. The
    // "Recent decisions" header is an inner div; its parent is the panel.
    const recentPanel = screen.getByText(/recent decisions/i).parentElement!
    fireEvent.click(within(recentPanel).getByText('BUY'))

    const dialog = screen.getByRole('dialog')
    // Veto reasons appear in the modal.
    expect(within(dialog).getByText(/vetoed — DATA_TOO_OLD/i)).toBeInTheDocument()
    // Orders section shows the filled order.
    expect(within(dialog).getByText('orders (1)')).toBeInTheDocument()
    // Position section is rendered.
    expect(within(dialog).getByText('entry → mark')).toBeInTheDocument()
  })
})

describe('<ChainMonitor /> audit filter wiring', () => {
  it('narrows the audit table when a module is selected', () => {
    // Seed three audit entries across two modules.
    useChainStore.setState({
      entries: [
        {
          id: 'a1',
          timestamp: 1,
          module: 'ai',
          eventType: 'AI_PROMPT_SENT',
          summary: 'prompt fired',
          data: {},
          _source: 't',
        },
        {
          id: 'a2',
          timestamp: 2,
          module: 'sentinel',
          eventType: 'SENTINEL_VETOED',
          summary: 'rejected',
          data: {},
          _source: 't',
        },
        {
          id: 'a3',
          timestamp: 3,
          module: 'sentinel',
          eventType: 'SENTINEL_APPROVED',
          summary: 'approved',
          data: {},
          _source: 't',
        },
      ],
    })
    render(<ChainMonitor />)

    // Before filtering: all three visible.
    expect(screen.getByText('prompt fired')).toBeInTheDocument()
    expect(screen.getByText('rejected')).toBeInTheDocument()
    expect(screen.getByText('approved')).toBeInTheDocument()

    // Two <select>s on the page (auto-run interval + audit module). Target
    // the audit one by finding its 'all modules' option and walking up.
    const allModulesOpt = screen.getByRole('option', { name: 'all modules' })
    const auditSelect = allModulesOpt.closest('select')!
    fireEvent.change(auditSelect, { target: { value: 'sentinel' } })

    // Now only sentinel rows remain.
    expect(screen.queryByText('prompt fired')).not.toBeInTheDocument()
    expect(screen.getByText('rejected')).toBeInTheDocument()
    expect(screen.getByText('approved')).toBeInTheDocument()
  })

  it('narrows the audit table via the query input (case-insensitive)', () => {
    useChainStore.setState({
      entries: [
        {
          id: 'a1',
          timestamp: 1,
          module: 'ai',
          eventType: 'AI_PROMPT_SENT',
          summary: 'claude prompted',
          data: {},
          _source: 't',
        },
        {
          id: 'a2',
          timestamp: 2,
          module: 'sentinel',
          eventType: 'SENTINEL_VETOED',
          summary: 'rejected because DATA_TOO_OLD',
          data: {},
          _source: 't',
        },
      ],
    })
    render(<ChainMonitor />)

    const input = screen.getByPlaceholderText(/filter event/i)
    fireEvent.change(input, { target: { value: 'data_too_old' } })

    expect(screen.queryByText('claude prompted')).not.toBeInTheDocument()
    expect(screen.getByText('rejected because DATA_TOO_OLD')).toBeInTheDocument()
  })

  it('clear button restores the full audit table', () => {
    useChainStore.setState({
      entries: [
        {
          id: 'a1',
          timestamp: 1,
          module: 'ai',
          eventType: 'AI_PROMPT_SENT',
          summary: 'prompt fired',
          data: {},
          _source: 't',
        },
        {
          id: 'a2',
          timestamp: 2,
          module: 'sentinel',
          eventType: 'SENTINEL_VETOED',
          summary: 'rejected',
          data: {},
          _source: 't',
        },
      ],
    })
    render(<ChainMonitor />)

    const input = screen.getByPlaceholderText(/filter event/i)
    fireEvent.change(input, { target: { value: 'rejected' } })
    expect(screen.queryByText('prompt fired')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('clear'))
    expect(screen.getByText('prompt fired')).toBeInTheDocument()
    expect(screen.getByText('rejected')).toBeInTheDocument()
  })
})
