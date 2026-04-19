import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { Journal } from '@/ui/screens/Journal'
import { addSignal, clearJournal } from '@/signals/journal'
import type { SignalEvent } from '@/types'

const sig = (over: Partial<SignalEvent> = {}): SignalEvent => ({
  id: `sig_${Math.random().toString(36).slice(2, 9)}`,
  instrumentId: 'BTCUSD',
  type: 'RSI_OVERSOLD',
  direction: 'bullish',
  strength: 0.8,
  description: 'RSI under 30',
  price: 60_000,
  timestamp: '2026-04-19T10:00:00Z',
  _source: 'mock',
  _status: 'LIVE',
  ...over,
})

beforeEach(() => clearJournal())
afterEach(() => cleanup())

describe('<Journal />', () => {
  it('renders the empty state when no signals are journalled', () => {
    render(<Journal />)
    expect(screen.getByText('Signal Journal')).toBeInTheDocument()
    expect(screen.getByTestId('journal-count-badge').textContent).toMatch(/0 signals/)
    expect(screen.getByText(/No signals detected yet/i)).toBeInTheDocument()
  })

  it('renders one row per journalled signal with the count badge', () => {
    addSignal(sig({ id: 's1', instrumentId: 'BTCUSD', type: 'RSI_OVERSOLD' }))
    addSignal(sig({ id: 's2', instrumentId: 'ETHUSD', type: 'EMA_CROSS_BULL' }))
    render(<Journal />)
    expect(screen.getByTestId('journal-count-badge').textContent).toMatch(/2 signals/)
    const table = screen.getByRole('table')
    expect(within(table).getByText('BTCUSD')).toBeInTheDocument()
    expect(within(table).getByText('ETHUSD')).toBeInTheDocument()
  })

  it('shows singular "signal" when only one entry', () => {
    addSignal(sig({ id: 'only_one' }))
    render(<Journal />)
    expect(screen.getByTestId('journal-count-badge').textContent).toMatch(/^1 signal$/)
  })
})
