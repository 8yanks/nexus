import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import { StatusBar } from '@/ui/components/StatusBar'
import { useMarketStore } from '@/store/market'
import type { MarketSnapshot } from '@/types'

// ─── HELPERS ─────────────────────────────────────────────────
const mkSnap = (id: string, status: MarketSnapshot['_status']): MarketSnapshot => ({
  instrumentId: id,
  price: 100,
  bid: 99,
  ask: 101,
  spreadBps: 10,
  high24h: 110,
  low24h: 90,
  volume24h: 1000,
  changePct24h: 0,
  timestamp: '2026-04-24T00:00:00Z',
  _source: 'mock',
  _status: status,
})

const resetStore = () => {
  useMarketStore.setState({
    snapshots: {},
    signals: [],
    lastRefresh: null,
  })
}

beforeEach(() => resetStore())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('<StatusBar /> — counts', () => {
  it('reports 0 LIVE FEEDS / 0 SIMULATED / 0 SIGNALS on an empty store', () => {
    render(<StatusBar />)
    expect(screen.getByText('0 LIVE FEEDS')).toBeInTheDocument()
    expect(screen.getByText('0 SIMULATED')).toBeInTheDocument()
    expect(screen.getByText('0 SIGNALS')).toBeInTheDocument()
  })

  it('counts LIVE vs SIMULATED snapshots by their _status field', () => {
    useMarketStore.setState({
      snapshots: {
        a: mkSnap('a', 'LIVE'),
        b: mkSnap('b', 'LIVE'),
        c: mkSnap('c', 'SIMULATED'),
        d: mkSnap('d', 'STALE'),
      },
    })
    render(<StatusBar />)
    expect(screen.getByText('2 LIVE FEEDS')).toBeInTheDocument()
    expect(screen.getByText('1 SIMULATED')).toBeInTheDocument()
  })

  it('reflects the running signal count from the store', () => {
    useMarketStore.setState({
      signals: [
        { id: 's1' } as never,
        { id: 's2' } as never,
        { id: 's3' } as never,
      ],
    })
    render(<StatusBar />)
    expect(screen.getByText('3 SIGNALS')).toBeInTheDocument()
  })
})

describe('<StatusBar /> — refresh recency', () => {
  it('shows REFRESHED NEVER when lastRefresh is null', () => {
    render(<StatusBar />)
    expect(screen.getByText(/REFRESHED NEVER/)).toBeInTheDocument()
  })

  it('formats a recent refresh in seconds', () => {
    const now = new Date('2026-04-24T12:00:00Z')
    vi.useFakeTimers()
    vi.setSystemTime(now)
    useMarketStore.setState({
      lastRefresh: new Date(now.getTime() - 12_000).toISOString(),
    })
    render(<StatusBar />)
    expect(screen.getByText(/REFRESHED 12s AGO/)).toBeInTheDocument()
  })

  it('formats minutes once we cross the 60s mark', () => {
    const now = new Date('2026-04-24T12:00:00Z')
    vi.useFakeTimers()
    vi.setSystemTime(now)
    useMarketStore.setState({
      lastRefresh: new Date(now.getTime() - 5 * 60_000).toISOString(),
    })
    render(<StatusBar />)
    expect(screen.getByText(/REFRESHED 5m AGO/)).toBeInTheDocument()
  })

  it('ticks the seconds label as time passes', () => {
    const now = new Date('2026-04-24T12:00:00Z')
    vi.useFakeTimers()
    vi.setSystemTime(now)
    useMarketStore.setState({
      lastRefresh: new Date(now.getTime() - 3_000).toISOString(),
    })
    render(<StatusBar />)
    expect(screen.getByText(/REFRESHED 3s AGO/)).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(2_000)
    })
    expect(screen.getByText(/REFRESHED 5s AGO/)).toBeInTheDocument()
  })
})

describe('<StatusBar /> — chrome', () => {
  it('exposes a status role with an aria-label so SRs see it as a system area', () => {
    render(<StatusBar />)
    expect(screen.getByRole('status', { name: /system status/i })).toBeInTheDocument()
  })

  it('always shows the analyst-bot ONLINE indicator', () => {
    render(<StatusBar />)
    expect(screen.getByText(/ANALYST BOT/)).toBeInTheDocument()
    expect(screen.getByText('ONLINE')).toBeInTheDocument()
  })
})


describe("<StatusBar /> — manual refresh", () => {
  it("renders a refresh button", () => {
    render(<StatusBar />)
    expect(screen.getByTestId("status-bar-refresh")).toBeInTheDocument()
  })

  it("button reads the current refreshed-ago label by default", () => {
    const now = new Date("2026-04-24T12:00:00Z")
    vi.useFakeTimers()
    vi.setSystemTime(now)
    useMarketStore.setState({
      lastRefresh: new Date(now.getTime() - 7_000).toISOString(),
    })
    render(<StatusBar />)
    expect(screen.getByTestId("status-bar-refresh").textContent).toMatch(/7s AGO/)
  })

  it("clicking the button calls refreshAll", async () => {
    const refreshAllMock = vi.fn().mockResolvedValue(undefined)
    useMarketStore.setState({ refreshAll: refreshAllMock as never })
    render(<StatusBar />)
    await act(async () => {
      screen.getByTestId("status-bar-refresh").click()
    })
    expect(refreshAllMock).toHaveBeenCalledTimes(1)
  })

  it("button shows REFRESHING… while in flight (debounce double-click)", async () => {
    let resolveIt: () => void = () => {}
    const refreshAllMock = vi.fn().mockReturnValue(new Promise<void>((r) => { resolveIt = r }))
    useMarketStore.setState({ refreshAll: refreshAllMock as never })
    render(<StatusBar />)
    await act(async () => {
      screen.getByTestId("status-bar-refresh").click()
    })
    expect(screen.getByTestId("status-bar-refresh").textContent).toMatch(/REFRESHING/i)
    // A second click during the in-flight call must not double-fire.
    await act(async () => {
      screen.getByTestId("status-bar-refresh").click()
    })
    expect(refreshAllMock).toHaveBeenCalledTimes(1)
    await act(async () => {
      resolveIt()
    })
  })
})
