import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within, act, waitFor } from '@testing-library/react'
import { DecisionDrilldownModal } from '@/ui/components/DecisionDrilldown'
import { buildDrilldown } from '@/ui/decision-drilldown'
import type { TradeDecision, SentinelVeto } from '@/types/decision'
import type { PaperOrder } from '@/types/order'
import type { Position } from '@/types/position'
import type { AuditEntry } from '@/types/audit'

// ─── FIXTURES ───────────────────────────────────────────────
let seq = 0
const baseDecision = (over: Partial<TradeDecision> = {}): TradeDecision => ({
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
  thesis: 'EMA crossover with volume confirmation',
  keyFactors: ['ema-cross', 'volume-spike'],
  invalidators: ['stop-hit', 'news-shock'],
  requiresHumanReview: false,
  modelSource: 'mock',
  consensusScore: null,
  _source: 'ai_orchestrator',
  _status: 'LIVE',
  _contextHash: 'h',
  ...over,
})

const vetoFor = (decisionId: string, over: Partial<SentinelVeto> = {}): SentinelVeto => ({
  id: `veto_${decisionId}`,
  timestamp: 1_700_000_000_000,
  decisionId,
  approved: false,
  vetoReasons: ['DATA_TOO_OLD'],
  riskMetrics: {
    currentDrawdown: 0.02,
    maxDrawdownLimit: 0.1,
    currentExposure: 0.3,
    maxExposureLimit: 1,
    dataQualityScore: 0.95,
    minDataQuality: 0.5,
    latencyMs: 42,
    maxLatencyMs: 500,
    brokerAvailable: true,
  },
  safeMode: false,
  _source: 'sentinel_engine',
  ...over,
})

const orderFor = (decisionId: string, over: Partial<PaperOrder> = {}): PaperOrder => ({
  id: `ord_${decisionId}`,
  timestamp: 1_700_000_000_000,
  decisionId,
  sentinelApprovalId: 'ok',
  instrumentId: 'BTCUSD',
  symbol: 'BTC/USD',
  side: 'buy',
  type: 'market',
  size: 0.1,
  price: 60_000,
  slippage: 0.0002,
  status: 'filled',
  fillPrice: 60_010,
  fillTime: 1_700_000_000_100,
  pnl: null,
  _source: 'paper_broker',
  _status: 'LIVE',
  ...over,
})

const positionFor = (decisionId: string, over: Partial<Position> = {}): Position => ({
  id: `pos_${decisionId}`,
  orderId: `ord_${decisionId}`,
  decisionId,
  instrumentId: 'BTCUSD',
  symbol: 'BTC/USD',
  side: 'long',
  size: 0.1,
  entryPrice: 60_010,
  stopLoss: 58_000,
  takeProfit: 65_000,
  openedAt: 1_700_000_000_100,
  closedAt: null,
  markPrice: 60_050,
  unrealizedPnl: 4,
  unrealizedPnlPct: 0.0066,
  realizedPnl: null,
  closeReason: null,
  status: 'open',
  _source: 'paper_broker',
  _status: 'LIVE',
  ...over,
})

const drilldownFor = (
  d: TradeDecision,
  ctx: Partial<{
    vetos: SentinelVeto[]
    orders: PaperOrder[]
    positions: Position[]
    entries: AuditEntry[]
  }> = {},
) =>
  buildDrilldown(d, {
    vetos: ctx.vetos ?? [],
    orders: ctx.orders ?? [],
    positions: ctx.positions ?? [],
    entries: ctx.entries,
  })

afterEach(() => cleanup())

// ─── TESTS ──────────────────────────────────────────────────
describe('<DecisionDrilldownModal />', () => {
  it('renders the action, symbol, and full thesis', () => {
    const d = baseDecision({
      action: 'BUY',
      symbol: 'ETH/USD',
      thesis: 'breakout above resistance with widening spread',
    })
    const onClose = vi.fn()
    render(<DecisionDrilldownModal data={drilldownFor(d)} onClose={onClose} />)
    expect(screen.getByText('BUY')).toBeInTheDocument()
    expect(screen.getByText('ETH/USD')).toBeInTheDocument()
    expect(
      screen.getByText('breakout above resistance with widening spread'),
    ).toBeInTheDocument()
  })

  it('lists key factors and invalidators', () => {
    const d = baseDecision({
      keyFactors: ['alpha-factor', 'beta-factor'],
      invalidators: ['invalid-1'],
    })
    render(
      <DecisionDrilldownModal data={drilldownFor(d)} onClose={vi.fn()} />,
    )
    expect(screen.getByText('alpha-factor')).toBeInTheDocument()
    expect(screen.getByText('beta-factor')).toBeInTheDocument()
    expect(screen.getByText('invalid-1')).toBeInTheDocument()
  })

  it('closes on Escape key', () => {
    const onClose = vi.fn()
    render(
      <DecisionDrilldownModal data={drilldownFor(baseDecision())} onClose={onClose} />,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on backdrop click but not on dialog-content click', () => {
    const onClose = vi.fn()
    render(
      <DecisionDrilldownModal data={drilldownFor(baseDecision())} onClose={onClose} />,
    )
    const dialog = screen.getByRole('dialog')
    // Click directly on the backdrop (the outer role=dialog element).
    fireEvent.click(dialog)
    expect(onClose).toHaveBeenCalledTimes(1)

    // Click inside on a known child element — should NOT trigger another close.
    fireEvent.click(screen.getByText('BUY'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes when the close button is pressed', () => {
    const onClose = vi.fn()
    render(
      <DecisionDrilldownModal data={drilldownFor(baseDecision())} onClose={onClose} />,
    )
    fireEvent.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows "no sentinel check recorded" when no veto is linked', () => {
    render(
      <DecisionDrilldownModal data={drilldownFor(baseDecision())} onClose={vi.fn()} />,
    )
    expect(
      screen.getByText(/no sentinel check recorded/i),
    ).toBeInTheDocument()
  })

  it('renders veto reasons + risk metrics when vetoed', () => {
    const d = baseDecision({ id: 'vetoed' })
    const v = vetoFor('vetoed', { vetoReasons: ['DATA_TOO_OLD', 'LATENCY_TOO_HIGH'] })
    render(
      <DecisionDrilldownModal
        data={drilldownFor(d, { vetos: [v] })}
        onClose={vi.fn()}
      />,
    )
    expect(
      screen.getByText(/✗ vetoed — DATA_TOO_OLD, LATENCY_TOO_HIGH/),
    ).toBeInTheDocument()
    expect(screen.getByText('latency 42ms')).toBeInTheDocument()
    expect(screen.getByText('broker up')).toBeInTheDocument()
  })

  it('renders an approved indicator when veto.approved is true', () => {
    const d = baseDecision({ id: 'ok' })
    const v = vetoFor('ok', { approved: true, vetoReasons: [] })
    render(
      <DecisionDrilldownModal
        data={drilldownFor(d, { vetos: [v] })}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('✓ approved')).toBeInTheDocument()
  })

  it('lists paper orders with status and side', () => {
    const d = baseDecision({ id: 'filled' })
    const o = orderFor('filled', { status: 'filled', side: 'buy' })
    render(
      <DecisionDrilldownModal
        data={drilldownFor(d, { orders: [o] })}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('orders (1)')).toBeInTheDocument()
    // Status and side cells use the same text; scope to the orders table row.
    expect(screen.getByText('filled')).toBeInTheDocument()
    expect(screen.getByText('buy')).toBeInTheDocument()
  })

  it('renders the position block with open status and PnL', () => {
    const d = baseDecision({ id: 'pos' })
    const p = positionFor('pos', { status: 'open', unrealizedPnl: 12.5 })
    render(
      <DecisionDrilldownModal
        data={drilldownFor(d, { positions: [p] })}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('12.50')).toBeInTheDocument()
    // "open" appears as the position status value.
    expect(screen.getAllByText('open').length).toBeGreaterThan(0)
  })

  it('renders per-provider cards for an agreed consensus decision', () => {
    const d = baseDecision({
      _source: 'ai_consensus',
      consensusScore: 1,
      thesis: '[claude] primary setup | [grok] secondary read',
    })
    render(
      <DecisionDrilldownModal data={drilldownFor(d)} onClose={vi.fn()} />,
    )
    expect(screen.getByText('providers (2)')).toBeInTheDocument()
    expect(screen.getByText('claude')).toBeInTheDocument()
    expect(screen.getByText('grok')).toBeInTheDocument()
    expect(screen.getByText('primary setup')).toBeInTheDocument()
    expect(screen.getByText('secondary read')).toBeInTheDocument()
  })

  it('renders per-provider vote cards (with conf) for a split HOLD', () => {
    const d = baseDecision({
      action: 'HOLD',
      size: 0,
      _source: 'ai_consensus',
      consensusScore: 0.5,
      thesis: 'consensus split',
      keyFactors: ['claude:BUY:0.80', 'grok:SELL:0.70'],
    })
    render(
      <DecisionDrilldownModal data={drilldownFor(d)} onClose={vi.fn()} />,
    )
    expect(screen.getByText(/split consensus/i)).toBeInTheDocument()
    // Each provider card shows its action + confidence. The provider id sits
    // in an inner <div>; step up to the card wrapper before scoping.
    const claudeCard = screen.getByText('claude').parentElement!
    expect(within(claudeCard).getByText('BUY')).toBeInTheDocument()
    expect(within(claudeCard).getByText('conf 0.80')).toBeInTheDocument()
    const grokCard = screen.getByText('grok').parentElement!
    expect(within(grokCard).getByText('SELL')).toBeInTheDocument()
    expect(within(grokCard).getByText('conf 0.70')).toBeInTheDocument()
  })

  it('omits the providers section entirely for a non-consensus decision', () => {
    render(
      <DecisionDrilldownModal
        data={drilldownFor(baseDecision({ _source: 'ai_orchestrator' }))}
        onClose={vi.fn()}
      />,
    )
    expect(screen.queryByText(/^providers \(/)).not.toBeInTheDocument()
  })

  it('shows the review badge when the decision requires human review', () => {
    render(
      <DecisionDrilldownModal
        data={drilldownFor(baseDecision({ requiresHumanReview: true }))}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('review')).toBeInTheDocument()
  })

  // ─── POLISH: copy / jump-to-audit / raw audit ────────────────

  it('copy JSON button writes the full drilldown payload to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    const d = baseDecision({ id: 'cp1', symbol: 'ETH/USD' })
    render(<DecisionDrilldownModal data={drilldownFor(d)} onClose={vi.fn()} />)
    await act(async () => {
      fireEvent.click(screen.getByText('copy JSON'))
    })
    expect(writeText).toHaveBeenCalledTimes(1)
    const payload = writeText.mock.calls[0][0] as string
    const parsed = JSON.parse(payload)
    expect(parsed.decision.id).toBe('cp1')
    expect(parsed.decision.symbol).toBe('ETH/USD')
  })

  it('copy button flashes "copied" then returns to default', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
    render(
      <DecisionDrilldownModal data={drilldownFor(baseDecision())} onClose={vi.fn()} />,
    )
    await act(async () => {
      fireEvent.click(screen.getByText('copy JSON'))
    })
    expect(screen.getByText('copied')).toBeInTheDocument()
    // The reset is on a real 1.8s setTimeout — wait for it to revert.
    // waitFor polls until the assertion passes or the test times out.
    await waitFor(
      () => {
        expect(screen.getByText('copy JSON')).toBeInTheDocument()
      },
      { timeout: 3000 },
    )
  })

  it('jump-to-audit button is hidden when the prop is omitted', () => {
    render(
      <DecisionDrilldownModal data={drilldownFor(baseDecision())} onClose={vi.fn()} />,
    )
    expect(screen.queryByText('jump to audit')).not.toBeInTheDocument()
  })

  it('jump-to-audit button hands the decision id back to the parent', () => {
    const onJump = vi.fn()
    const d = baseDecision({ id: 'jump-me' })
    render(
      <DecisionDrilldownModal
        data={drilldownFor(d)}
        onClose={vi.fn()}
        onJumpToAudit={onJump}
      />,
    )
    fireEvent.click(screen.getByText('jump to audit'))
    expect(onJump).toHaveBeenCalledWith('jump-me')
  })

  it('raw audit section is hidden when no entries are correlated', () => {
    render(
      <DecisionDrilldownModal data={drilldownFor(baseDecision())} onClose={vi.fn()} />,
    )
    expect(screen.queryByText(/^raw audit/)).not.toBeInTheDocument()
  })

  it('raw audit section is folded by default and reveals JSON on toggle', () => {
    const d = baseDecision({ id: 'raw-d' })
    const e: AuditEntry = {
      id: 'e-validated',
      timestamp: 1_700_000_000_000,
      module: 'ai',
      eventType: 'AI_RESPONSE_VALIDATED',
      summary: 'claude validated',
      data: { decisionId: 'raw-d', confidence: 0.81, magic: 'visible-on-toggle' },
      _source: 't',
    }
    render(
      <DecisionDrilldownModal
        data={drilldownFor(d, { entries: [e] })}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('raw audit (1)')).toBeInTheDocument()
    // The payload itself is not rendered until the user clicks "show".
    expect(screen.queryByText(/visible-on-toggle/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('show'))
    expect(screen.getByText(/visible-on-toggle/)).toBeInTheDocument()
    expect(screen.getByText('AI_RESPONSE_VALIDATED')).toBeInTheDocument()
    // Re-collapsing hides the payload again.
    fireEvent.click(screen.getByText('hide'))
    expect(screen.queryByText(/visible-on-toggle/)).not.toBeInTheDocument()
  })
})
