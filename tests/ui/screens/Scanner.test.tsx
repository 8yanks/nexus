import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { Scanner } from '@/ui/screens/Scanner'
import { useMarketStore } from '@/store/market'
import type { SignalEvent } from '@/types'

const sig = (over: Partial<SignalEvent> = {}): SignalEvent => ({
  id: `sig_${Math.random().toString(36).slice(2, 8)}`,
  instrumentId: 'BTCUSD',
  type: 'RSI_OVERSOLD',
  direction: 'bullish',
  strength: 0.8,
  description: '',
  price: 60_000,
  timestamp: '2026-04-19T10:00:00Z',
  _source: 'mock',
  _status: 'LIVE',
  ...over,
})

beforeEach(() => useMarketStore.setState({ signals: [] }))
afterEach(() => cleanup())

describe('<Scanner />', () => {
  it('renders ScreenHeader with the no-signals badge', () => {
    render(<Scanner />)
    expect(screen.getByText('Signal Scanner')).toBeInTheDocument()
    const badge = screen.getByTestId('scanner-signals-badge')
    expect(badge.textContent).toMatch(/0 inst · 0 signals/)
    expect(screen.getByText(/No signals detected/i)).toBeInTheDocument()
  })

  it('reflects active signal counts in the badge and renders the active section', () => {
    const insts = useMarketStore.getState().instruments
    const target = insts[0]!
    useMarketStore.setState({
      signals: [
        sig({ id: 's1', instrumentId: target.id, type: 'RSI_OVERSOLD' }),
        sig({ id: 's2', instrumentId: target.id, type: 'EMA_CROSS_BULL' }),
      ],
    })
    render(<Scanner />)
    const badge = screen.getByTestId('scanner-signals-badge')
    expect(badge.textContent).toMatch(/1 inst · 2 signals/)
    expect(screen.getByText('Active Signals')).toBeInTheDocument()
    // Quiet section is also visible because there are other instruments.
    expect(screen.getByText('Quiet')).toBeInTheDocument()
  })

  it('singularises "signal" when only one is active', () => {
    const insts = useMarketStore.getState().instruments
    useMarketStore.setState({
      signals: [sig({ id: 'only', instrumentId: insts[0]!.id })],
    })
    render(<Scanner />)
    expect(screen.getByTestId('scanner-signals-badge').textContent).toMatch(/1 inst · 1 signal$/)
  })
})
