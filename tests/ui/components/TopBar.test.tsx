import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { TopBar } from '@/ui/components/TopBar'
import { useMarketStore } from '@/store/market'
import type { Instrument } from '@/types'

// ─── HELPERS ─────────────────────────────────────────────────
const mkInst = (
  id: string,
  symbol: string,
  name: string,
): Instrument => ({
  id,
  symbol,
  name,
  assetClass: 'crypto_spot',
  exchange: 'binance',
  baseCurrency: 'BTC',
  quoteCurrency: 'USDT',
  contractType: 'spot',
  tickSize: 0.01,
  lotSize: 0.0001,
  metadata: { listingDate: '2020-01-01', sector: null },
})

const resetStore = () => {
  useMarketStore.setState({
    screen: 'dashboard',
    instruments: [],
    selectedInstrumentId: null,
    binanceConnected: false,
    coinbaseConnected: false,
    krakenConnected: false,
  })
}

beforeEach(() => resetStore())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('<TopBar /> — title slot', () => {
  it('renders the active screen title', () => {
    useMarketStore.setState({ screen: 'sentinel' })
    render(<TopBar />)
    expect(screen.getByText('Sentinel')).toBeInTheDocument()
  })

  it('updates the title when the screen changes', () => {
    render(<TopBar />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    act(() => {
      useMarketStore.setState({ screen: 'trader' })
    })
    expect(screen.getByText('Trader')).toBeInTheDocument()
  })
})

describe('<TopBar /> — search', () => {
  it('shows no dropdown when the input is unfocused', () => {
    useMarketStore.setState({
      instruments: [mkInst('btc-binance', 'BTCUSDT', 'Bitcoin')],
    })
    render(<TopBar />)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('shows nothing on focus when the query is empty', () => {
    useMarketStore.setState({
      instruments: [mkInst('btc-binance', 'BTCUSDT', 'Bitcoin')],
    })
    render(<TopBar />)
    fireEvent.focus(screen.getByRole('searchbox'))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('matches symbol or name (case-insensitive) and renders results', () => {
    useMarketStore.setState({
      instruments: [
        mkInst('btc', 'BTCUSDT', 'Bitcoin'),
        mkInst('eth', 'ETHUSDT', 'Ethereum'),
        mkInst('sol', 'SOLUSDT', 'Solana'),
      ],
    })
    render(<TopBar />)
    const input = screen.getByRole('searchbox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'sol' } })
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /SOLUSDT/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /BTCUSDT/ })).not.toBeInTheDocument()
  })

  it('caps the dropdown at 8 results', () => {
    const many = Array.from({ length: 25 }, (_, i) =>
      mkInst(`a${i}`, `ASYM${i}`, `Asset ${i}`),
    )
    useMarketStore.setState({ instruments: many })
    render(<TopBar />)
    const input = screen.getByRole('searchbox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'asym' } })
    const listbox = screen.getByRole('listbox')
    expect(listbox.querySelectorAll('li').length).toBe(8)
  })

  it('selecting a result navigates to Detail and focuses that instrument', () => {
    useMarketStore.setState({
      instruments: [
        mkInst('btc', 'BTCUSDT', 'Bitcoin'),
        mkInst('eth', 'ETHUSDT', 'Ethereum'),
      ],
    })
    render(<TopBar />)
    const input = screen.getByRole('searchbox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'eth' } })
    fireEvent.mouseDown(screen.getByRole('button', { name: /ETHUSDT/ }))

    const state = useMarketStore.getState()
    expect(state.screen).toBe('detail')
    expect(state.selectedInstrumentId).toBe('eth')
  })
})

describe('<TopBar /> — right cluster', () => {
  it('ANALYST MODE chip routes to Options', () => {
    render(<TopBar />)
    fireEvent.click(screen.getByRole('button', { name: /Analyst mode/i }))
    expect(useMarketStore.getState().screen).toBe('options')
  })

  it('shows OFFLINE when no provider is connected', () => {
    render(<TopBar />)
    expect(screen.getByText('OFFLINE')).toBeInTheDocument()
  })

  it('shows LIVE · X/Y when at least one provider is connected', () => {
    useMarketStore.setState({
      binanceConnected: true,
      coinbaseConnected: false,
      krakenConnected: true,
    })
    render(<TopBar />)
    expect(screen.getByText('LIVE · 2/3')).toBeInTheDocument()
  })

  it('live indicator routes to Sources', () => {
    render(<TopBar />)
    fireEvent.click(
      screen.getByRole('button', { name: /providers connected/i }),
    )
    expect(useMarketStore.getState().screen).toBe('sources')
  })

  it('renders a wall clock that ticks every second', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-24T15:30:42'))
    render(<TopBar />)
    expect(screen.getByLabelText('Wall clock')).toHaveTextContent(/15:30:42/)
    act(() => {
      vi.advanceTimersByTime(2_000)
    })
    expect(screen.getByLabelText('Wall clock')).toHaveTextContent(/15:30:44/)
  })
})
