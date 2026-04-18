import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Nav } from '@/ui/components/Nav'
import { useMarketStore } from '@/store/market'

// ─── STORE RESET ────────────────────────────────────────────
// The Nav reads `screen` and `binanceConnected` from the shared market
// store. Before each test we pin it to a known baseline so assertions
// don't leak across tests.
const resetMarketStore = () => {
  useMarketStore.setState({
    screen: 'dashboard',
    binanceConnected: false,
  })
}

beforeEach(() => resetMarketStore())
afterEach(() => cleanup())

describe('<Nav /> rendering', () => {
  it('renders the NEXUS brand + ANALYST MODE badge', () => {
    render(<Nav />)
    expect(screen.getByText('NEXUS')).toBeInTheDocument()
    expect(screen.getByText('ANALYST MODE')).toBeInTheDocument()
  })

  it('renders all 15 nav items as buttons', () => {
    render(<Nav />)
    const labels = [
      'Dashboard',
      'Scanner',
      'Alerts',
      'Correlation',
      'Backtest',
      'Corporate',
      'VC Flow',
      'Macro',
      'Quality',
      'Sources',
      'Journal',
      'Export',
      'Chain',
      'Sentinel',
      'Trader',
    ]
    for (const label of labels) {
      expect(screen.getByRole('button', { name: new RegExp(label, 'i') })).toBeInTheDocument()
    }
  })
})

describe('<Nav /> live indicator', () => {
  it('shows OFFLINE when binance is not connected', () => {
    render(<Nav />)
    expect(screen.getByText('OFFLINE')).toBeInTheDocument()
    expect(screen.queryByText('LIVE')).not.toBeInTheDocument()
  })

  it('flips to LIVE when the store reports a connection', () => {
    useMarketStore.setState({ binanceConnected: true })
    render(<Nav />)
    expect(screen.getByText('LIVE')).toBeInTheDocument()
    expect(screen.queryByText('OFFLINE')).not.toBeInTheDocument()
  })
})

describe('<Nav /> navigation', () => {
  it('calls setScreen and flips the store when a nav item is clicked', () => {
    render(<Nav />)
    fireEvent.click(screen.getByRole('button', { name: /sentinel/i }))
    expect(useMarketStore.getState().screen).toBe('sentinel')
  })

  it('routes back to dashboard when the NEXUS logo is clicked', () => {
    useMarketStore.setState({ screen: 'trader' })
    render(<Nav />)
    fireEvent.click(screen.getByText('NEXUS'))
    expect(useMarketStore.getState().screen).toBe('dashboard')
  })

  it('renders the active tab with the accent foreground color', () => {
    useMarketStore.setState({ screen: 'chain' })
    render(<Nav />)
    const active = screen.getByRole('button', { name: /chain/i })
    const inactive = screen.getByRole('button', { name: /trader/i })
    // Active tab uses a bold weight; inactive buttons stay at regular weight.
    expect(active).toHaveStyle({ fontWeight: '600' })
    expect(inactive).toHaveStyle({ fontWeight: '400' })
  })
})
