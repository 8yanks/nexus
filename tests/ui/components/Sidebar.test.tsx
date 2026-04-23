import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { Sidebar } from '@/ui/components/Sidebar'
import { useMarketStore } from '@/store/market'

// ─── STORE + STORAGE RESET ──────────────────────────────────
const COLLAPSE_KEY = 'nexus_sidebar_collapsed'

const resetStore = () => {
  useMarketStore.setState({
    screen: 'dashboard',
    binanceConnected: false,
    coinbaseConnected: false,
    krakenConnected: false,
  })
}

beforeEach(() => {
  resetStore()
  window.localStorage.removeItem(COLLAPSE_KEY)
})
afterEach(() => cleanup())

describe('<Sidebar /> — chrome', () => {
  it('renders the NEXUS brand mark when expanded', () => {
    render(<Sidebar />)
    expect(screen.getByText('NEXUS')).toBeInTheDocument()
  })

  it('exposes itself as the primary navigation landmark', () => {
    render(<Sidebar />)
    expect(
      screen.getByRole('complementary', { name: /primary navigation/i }),
    ).toBeInTheDocument()
  })

  it('renders all 5 category group labels in expanded mode', () => {
    render(<Sidebar />)
    for (const label of ['Markets', 'Bots', 'Research', 'Information', 'System']) {
      expect(screen.getByRole('group', { name: label })).toBeInTheDocument()
    }
  })
})

describe('<Sidebar /> — screen items', () => {
  it('renders every screen across the 5 categories', () => {
    render(<Sidebar />)
    // 16 visible screens: detail is excluded from sidebar lists.
    const expected = [
      'Dashboard', 'Scanner', 'Correlation', 'Macro',
      'Chain', 'Sentinel', 'Trader',
      'Backtest', 'Quality',
      'VC Flow', 'Corporate', 'Alerts', 'Journal',
      'Sources', 'Export', 'Options',
    ]
    for (const label of expected) {
      expect(screen.getByRole('button', { name: new RegExp(`^${label}$`, 'i') })).toBeInTheDocument()
    }
  })

  it('marks the active screen with aria-current="page"', () => {
    useMarketStore.setState({ screen: 'sentinel' })
    render(<Sidebar />)
    const sentinelBtn = screen.getByRole('button', { name: /^Sentinel$/i })
    expect(sentinelBtn).toHaveAttribute('aria-current', 'page')
    expect(sentinelBtn).toHaveAttribute('data-active', 'true')

    const dashBtn = screen.getByRole('button', { name: /^Dashboard$/i })
    expect(dashBtn).toHaveAttribute('data-active', 'false')
  })

  it('navigates on click', () => {
    render(<Sidebar />)
    fireEvent.click(screen.getByRole('button', { name: /^Trader$/i }))
    expect(useMarketStore.getState().screen).toBe('trader')
  })
})

describe('<Sidebar /> — collapse toggle', () => {
  it('hides the brand label and category headers when collapsed', () => {
    render(<Sidebar />)
    fireEvent.click(screen.getByRole('button', { name: /collapse sidebar/i }))
    expect(screen.queryByText('NEXUS')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Markets' })).toBeInTheDocument()
    expect(screen.queryByText('Markets')).not.toBeInTheDocument()
  })

  it('persists the collapsed state to localStorage', () => {
    render(<Sidebar />)
    fireEvent.click(screen.getByRole('button', { name: /collapse sidebar/i }))
    expect(window.localStorage.getItem(COLLAPSE_KEY)).toBe('1')

    fireEvent.click(screen.getByRole('button', { name: /expand sidebar/i }))
    expect(window.localStorage.getItem(COLLAPSE_KEY)).toBe('0')
  })

  it('restores the collapsed state from localStorage on mount', () => {
    window.localStorage.setItem(COLLAPSE_KEY, '1')
    render(<Sidebar />)
    expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument()
    expect(screen.queryByText('NEXUS')).not.toBeInTheDocument()
  })

  it('keeps screen items reachable when collapsed (icon-only with title tooltips)', () => {
    window.localStorage.setItem(COLLAPSE_KEY, '1')
    render(<Sidebar />)
    // The label is no longer rendered as text; it survives only as the title attr.
    const trader = screen.getByRole('button', { name: /^Trader$/i })
    expect(trader).toHaveAttribute('title', 'Trader')
  })
})

describe('<Sidebar /> — live indicator', () => {
  it('shows OFFLINE when no provider is connected', () => {
    render(<Sidebar />)
    expect(screen.getByText('OFFLINE')).toBeInTheDocument()
  })

  it('shows X/Y LIVE based on connected providers', () => {
    useMarketStore.setState({
      binanceConnected: true,
      coinbaseConnected: true,
      krakenConnected: false,
    })
    render(<Sidebar />)
    expect(screen.getByText('2/3 LIVE')).toBeInTheDocument()
  })

  it('routes to Sources on click', () => {
    render(<Sidebar />)
    const within_ = within(screen.getByRole('complementary', { name: /primary navigation/i }))
    const liveBtn = within_.getByRole('button', { name: /providers connected/i })
    fireEvent.click(liveBtn)
    expect(useMarketStore.getState().screen).toBe('sources')
  })
})
