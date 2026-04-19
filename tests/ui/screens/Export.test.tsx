import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Export } from '@/ui/screens/Export'
import { useMarketStore } from '@/store/market'
import type { MarketSnapshot } from '@/types'

const snap = (over: Partial<MarketSnapshot> = {}): MarketSnapshot => ({
  instrumentId: 'BTCUSD',
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

beforeEach(() => useMarketStore.setState({ snapshots: {} }))
afterEach(() => cleanup())

describe('<Export />', () => {
  it('shows the waiting badge and empty-state copy when no snapshots loaded', () => {
    render(<Export />)
    expect(screen.getByText('Export Data')).toBeInTheDocument()
    expect(screen.getByTestId('export-empty-badge')).toBeInTheDocument()
    expect(screen.getByText(/No data loaded yet/i)).toBeInTheDocument()
  })

  it('shows the ready badge and export buttons when snapshots are present', () => {
    useMarketStore.setState({ snapshots: { BTCUSD: snap() } })
    render(<Export />)
    expect(screen.getByTestId('export-ready-badge')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Export CSV/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Export JSON/i })).toBeInTheDocument()
  })

  it('clicking Export CSV does not throw', () => {
    useMarketStore.setState({ snapshots: { BTCUSD: snap() } })
    // Stub URL.createObjectURL — jsdom doesn't implement it.
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:mock'),
      revokeObjectURL: vi.fn(),
    })
    render(<Export />)
    expect(() =>
      fireEvent.click(screen.getByRole('button', { name: /Export CSV/i })),
    ).not.toThrow()
    vi.unstubAllGlobals()
  })
})
