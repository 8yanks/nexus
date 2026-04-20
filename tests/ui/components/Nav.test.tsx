import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
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
    coinbaseConnected: false,
    krakenConnected: false,
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

  it('renders all 5 category tabs in the primary row', () => {
    render(<Nav />)
    for (const label of ['Markets', 'Bots', 'Research', 'Information', 'System']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('renders the subscreens of the active category in the secondary row', () => {
    // Default screen is dashboard → category is "markets" with 4 subscreens.
    render(<Nav />)
    const tablist = screen.getByRole('tablist')
    for (const label of ['Dashboard', 'Scanner', 'Correlation', 'Macro']) {
      expect(within(tablist).getByRole('tab', { name: new RegExp(label, 'i') })).toBeInTheDocument()
    }
    // Subscreens of OTHER categories must not leak into the secondary row.
    expect(within(tablist).queryByRole('tab', { name: /chain/i })).not.toBeInTheDocument()
    expect(within(tablist).queryByRole('tab', { name: /sources/i })).not.toBeInTheDocument()
  })

  it('switches the secondary row when the active category changes', () => {
    useMarketStore.setState({ screen: 'sentinel' })
    render(<Nav />)
    const tablist = screen.getByRole('tablist')
    for (const label of ['Chain', 'Sentinel', 'Trader']) {
      expect(within(tablist).getByRole('tab', { name: new RegExp(label, 'i') })).toBeInTheDocument()
    }
    expect(within(tablist).queryByRole('tab', { name: /dashboard/i })).not.toBeInTheDocument()
  })
})

describe('<Nav /> live indicator', () => {
  it('shows OFFLINE when no exchange is connected', () => {
    render(<Nav />)
    expect(screen.getByText('OFFLINE')).toBeInTheDocument()
    expect(screen.queryByText(/LIVE/)).not.toBeInTheDocument()
  })

  it('shows "LIVE · N/total" and counts each connected exchange', () => {
    useMarketStore.setState({
      binanceConnected: true,
      coinbaseConnected: false,
      krakenConnected: false,
    })
    render(<Nav />)
    expect(screen.getByText('LIVE · 1/3')).toBeInTheDocument()
    expect(screen.queryByText('OFFLINE')).not.toBeInTheDocument()
  })

  it('all three connected reads "LIVE · 3/3"', () => {
    useMarketStore.setState({
      binanceConnected: true,
      coinbaseConnected: true,
      krakenConnected: true,
    })
    render(<Nav />)
    expect(screen.getByText('LIVE · 3/3')).toBeInTheDocument()
  })

  it('clicking the LIVE badge routes to Sources', () => {
    useMarketStore.setState({ binanceConnected: true })
    render(<Nav />)
    fireEvent.click(screen.getByText('LIVE · 1/3'))
    expect(useMarketStore.getState().screen).toBe('sources')
  })

  it('clicking the ANALYST MODE badge routes to Options', () => {
    render(<Nav />)
    fireEvent.click(screen.getByText('ANALYST MODE'))
    expect(useMarketStore.getState().screen).toBe('options')
  })
})

describe('<Nav /> primary navigation', () => {
  it('clicking a category jumps to its first subscreen', () => {
    render(<Nav />)
    fireEvent.click(screen.getByRole('button', { name: 'Bots' }))
    // Bots' first subscreen is 'chain'.
    expect(useMarketStore.getState().screen).toBe('chain')
  })

  it('clicking the active category does NOT change the screen', () => {
    // Already on dashboard (markets). Clicking Markets should be a no-op.
    useMarketStore.setState({ screen: 'scanner' })
    render(<Nav />)
    fireEvent.click(screen.getByRole('button', { name: 'Markets' }))
    expect(useMarketStore.getState().screen).toBe('scanner')
  })

  it('routes back to dashboard when the NEXUS logo is clicked', () => {
    useMarketStore.setState({ screen: 'trader' })
    render(<Nav />)
    fireEvent.click(screen.getByText('NEXUS'))
    expect(useMarketStore.getState().screen).toBe('dashboard')
  })

  it('renders the active category tab with the bold weight', () => {
    useMarketStore.setState({ screen: 'chain' })
    render(<Nav />)
    const active = screen.getByRole('button', { name: 'Bots' })
    const inactive = screen.getByRole('button', { name: 'Markets' })
    expect(active).toHaveStyle({ fontWeight: '600' })
    expect(inactive).toHaveStyle({ fontWeight: '500' })
  })
})

describe('<Nav /> secondary navigation', () => {
  it('clicking a subscreen tab calls setScreen to that screen', () => {
    render(<Nav />)
    const tablist = screen.getByRole('tablist')
    fireEvent.click(within(tablist).getByRole('tab', { name: /scanner/i }))
    expect(useMarketStore.getState().screen).toBe('scanner')
  })

  it('marks the active subscreen tab with aria-selected=true', () => {
    useMarketStore.setState({ screen: 'correlation' })
    render(<Nav />)
    const tablist = screen.getByRole('tablist')
    const active = within(tablist).getByRole('tab', { name: /correlation/i })
    const inactive = within(tablist).getByRole('tab', { name: /scanner/i })
    expect(active).toHaveAttribute('aria-selected', 'true')
    expect(inactive).toHaveAttribute('aria-selected', 'false')
  })

  it('shows the markets subnav when drilled into the detail screen', () => {
    // detail is hidden from the subnav but should keep the markets
    // category active so the user can navigate back via the same row.
    useMarketStore.setState({ screen: 'detail' })
    render(<Nav />)
    const tablist = screen.getByRole('tablist')
    expect(within(tablist).getByRole('tab', { name: /dashboard/i })).toBeInTheDocument()
    // No "Detail" tab should render — it's a hidden drilldown.
    expect(within(tablist).queryByRole('tab', { name: /^detail$/i })).not.toBeInTheDocument()
  })
})
