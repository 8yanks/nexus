import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { Detail } from '@/ui/screens/Detail'
import { useMarketStore } from '@/store/market'
import type { MarketSnapshot } from '@/types'

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

beforeEach(() => {
  useMarketStore.setState({ selectedInstrumentId: null, snapshots: {} })
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
