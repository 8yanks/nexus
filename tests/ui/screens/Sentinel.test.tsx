import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { Sentinel } from '@/ui/screens/Sentinel'
import { useChainStore, type ReviewRequest } from '@/store/chain'
import { auditLogger } from '@/audit/logger'
import type { TradeDecision, SentinelVeto } from '@/types/decision'

// ─── FIXTURES ───────────────────────────────────────────────
let seq = 0

const decision = (over: Partial<TradeDecision> = {}): TradeDecision => ({
  id: `dec_${seq++}`,
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
  thesis: 'unique-review-thesis',
  keyFactors: ['ema'],
  invalidators: ['stop'],
  requiresHumanReview: true,
  modelSource: 'mock',
  consensusScore: null,
  _source: 'ai_orchestrator',
  _status: 'LIVE',
  _contextHash: 'h',
  ...over,
})

const veto = (over: Partial<SentinelVeto> = {}): SentinelVeto => ({
  id: `v_${seq++}`,
  timestamp: 1_700_000_000_000,
  decisionId: 'dec_x',
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
  ...over,
})

const review = (over: Partial<ReviewRequest> = {}): ReviewRequest => {
  const d = decision({ id: `dec_rev_${seq}` })
  const v = veto({ id: `v_rev_${seq}`, decisionId: d.id, vetoReasons: ['MANUAL_BLOCK'] })
  return {
    id: `rev_${seq++}`,
    queuedAt: 1_700_000_000_000,
    decision: d,
    veto: v,
    otherReasons: [],
    ...over,
  }
}

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

// ─── HEADER + STAT CARDS ────────────────────────────────────
describe('<Sentinel /> header & stat cards', () => {
  it('renders the empty-state baseline when nothing has run yet', () => {
    render(<Sentinel />)
    // Header subtitle reflects zero counts.
    expect(
      screen.getByText(/0 checks · 0 vetoed · 0 approved/i),
    ).toBeInTheDocument()
    // Approval rate is "—" when there are no checks.
    const card = screen.getByText('approval rate').parentElement!
    expect(within(card).getByText('—')).toBeInTheDocument()
    // Empty-state copy in veto reasons panel.
    expect(
      screen.getByText(/no vetos yet — run the chain/i),
    ).toBeInTheDocument()
    // History panel empty-state.
    expect(
      screen.getByText(/no checks yet — run the chain/i),
    ).toBeInTheDocument()
  })

  it('renders approval rate and counts from a mixed veto history', () => {
    useChainStore.setState({
      vetos: [
        veto({ approved: true, vetoReasons: [] }),
        veto({ approved: true, vetoReasons: [] }),
        veto({ approved: false, vetoReasons: ['DATA_TOO_OLD'] }),
        veto({ approved: false, vetoReasons: ['MANUAL_BLOCK', 'DATA_TOO_OLD'] }),
      ],
    })
    render(<Sentinel />)
    // 2 of 4 approved → 50%.
    const approvalCard = screen.getByText('approval rate').parentElement!
    expect(within(approvalCard).getByText('50%')).toBeInTheDocument()
    // Total checks card.
    const totalCard = screen.getByText('total checks').parentElement!
    expect(within(totalCard).getByText('4')).toBeInTheDocument()
    // Vetoed card shows 2 (lowercase label disambiguates from history "✗ vetoed" cells).
    const vetoedCard = screen.getByText('vetoed').parentElement!
    expect(within(vetoedCard).getByText('2')).toBeInTheDocument()
  })
})

// ─── SAFE MODE TOGGLE ───────────────────────────────────────
describe('<Sentinel /> safe-mode toggle', () => {
  it('reflects the current safeMode state in the checkbox + label', () => {
    useChainStore.setState({ safeMode: true })
    render(<Sentinel />)
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement
    expect(checkbox.checked).toBe(true)
    expect(screen.getByText(/safe mode ACTIVE/i)).toBeInTheDocument()
  })

  it('flips the store when the checkbox is clicked', () => {
    render(<Sentinel />)
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement
    expect(checkbox.checked).toBe(false)
    fireEvent.click(checkbox)
    expect(useChainStore.getState().safeMode).toBe(true)
  })
})

// ─── VETO REASONS BREAKDOWN ─────────────────────────────────
describe('<Sentinel /> veto reasons breakdown', () => {
  it('aggregates and sorts veto reasons by count desc', () => {
    useChainStore.setState({
      vetos: [
        veto({ approved: false, vetoReasons: ['DATA_TOO_OLD'] }),
        veto({ approved: false, vetoReasons: ['DATA_TOO_OLD'] }),
        veto({ approved: false, vetoReasons: ['DATA_TOO_OLD', 'MANUAL_BLOCK'] }),
        veto({ approved: false, vetoReasons: ['MAX_DRAWDOWN_BREACH'] }),
      ],
    })
    render(<Sentinel />)
    // 3 distinct reasons: DATA_TOO_OLD x3, MANUAL_BLOCK x1, MAX_DRAWDOWN_BREACH x1.
    const reasonsHeader = screen.getByText(/veto reasons \(3\)/i)
    const reasonsPanel = reasonsHeader.parentElement!
    // The breakdown table cells (scoped to the breakdown panel — the reason
    // names also appear in the history table at the bottom).
    expect(within(reasonsPanel).getByText('DATA_TOO_OLD')).toBeInTheDocument()
    expect(within(reasonsPanel).getByText('MANUAL_BLOCK')).toBeInTheDocument()
    expect(within(reasonsPanel).getByText('MAX_DRAWDOWN_BREACH')).toBeInTheDocument()

    // First reason row should be DATA_TOO_OLD (highest count).
    const rows = within(reasonsPanel).getAllByRole('row')
    expect(rows.length).toBe(3)
    expect(within(rows[0]).getByText('DATA_TOO_OLD')).toBeInTheDocument()
  })
})

// ─── REVIEW QUEUE ───────────────────────────────────────────
describe('<Sentinel /> pending review queue', () => {
  it('renders nothing when the queue is empty', () => {
    render(<Sentinel />)
    expect(screen.queryByText(/^Pending review \(/)).not.toBeInTheDocument()
    // The "pending review" stat card still shows with value 0.
    const pendingCard = screen.getByText('pending review').parentElement!
    expect(within(pendingCard).getByText('0')).toBeInTheDocument()
  })

  it('renders the queue table and reflects the queue count', () => {
    useChainStore.setState({ reviewQueue: [review(), review()] })
    render(<Sentinel />)
    expect(screen.getByText(/Pending review \(2\)/)).toBeInTheDocument()
    // Stat card uses lowercase label without a count — disambiguates from the queue header.
    const pendingCard = screen.getByText('pending review').parentElement!
    expect(within(pendingCard).getByText('2')).toBeInTheDocument()
    // Both rows expose accept + dismiss buttons.
    expect(screen.getAllByRole('button', { name: 'accept' })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'dismiss' })).toHaveLength(2)
  })

  it('drops the queued review when "dismiss" is clicked', () => {
    const r = review()
    useChainStore.setState({ reviewQueue: [r] })
    render(<Sentinel />)

    fireEvent.click(screen.getByRole('button', { name: 'dismiss' }))

    // Store mutated, queue empty.
    expect(useChainStore.getState().reviewQueue).toHaveLength(0)
    // An audit entry was logged describing the dismissal.
    const dismissEntry = auditLogger
      .list()
      .find(
        (e) => e.eventType === 'REVIEW_COMPLETED' && e.summary.includes('dismissed'),
      )
    expect(dismissEntry).toBeDefined()
    expect((dismissEntry!.data as { reviewId?: string }).reviewId).toBe(r.id)
  })

  it('removes the row + logs an override when "accept" is clicked', () => {
    const r = review()
    useChainStore.setState({ reviewQueue: [r] })
    render(<Sentinel />)

    fireEvent.click(screen.getByRole('button', { name: 'accept' }))

    expect(useChainStore.getState().reviewQueue).toHaveLength(0)
    // A "manual override accepted" audit entry should have been logged.
    const acceptEntry = auditLogger
      .list()
      .find(
        (e) =>
          e.eventType === 'REVIEW_COMPLETED' &&
          e.summary.includes('accepted'),
      )
    expect(acceptEntry).toBeDefined()
    // Accepting injects an override veto into vetos[].
    const overrideVeto = useChainStore
      .getState()
      .vetos.find((v) => v.approved && v.vetoReasons.length === 0)
    expect(overrideVeto).toBeDefined()
  })
})
