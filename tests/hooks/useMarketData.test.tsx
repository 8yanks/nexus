import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useMarketData } from '@/hooks/useMarketData'
import { useMarketStore } from '@/store/market'

beforeEach(() => {
  // Stub the auto-refresh actions so the hook doesn't kick off real timers /
  // network calls in a unit-test environment.
  useMarketStore.setState({
    startAutoRefresh: vi.fn() as never,
    stopAutoRefresh: vi.fn() as never,
  })
})

describe('useMarketData', () => {
  it('starts auto-refresh on mount and stops on unmount', () => {
    const start = useMarketStore.getState().startAutoRefresh as unknown as ReturnType<typeof vi.fn>
    const stop = useMarketStore.getState().stopAutoRefresh as unknown as ReturnType<typeof vi.fn>
    const { unmount } = renderHook(() => useMarketData())
    expect(start).toHaveBeenCalledWith(5000)
    expect(stop).not.toHaveBeenCalled()
    unmount()
    expect(stop).toHaveBeenCalled()
  })

  it('exposes the watchlist slice the dashboard needs', () => {
    const { result } = renderHook(() => useMarketData())
    expect(result.current).toHaveProperty('instruments')
    expect(result.current).toHaveProperty('snapshots')
    expect(result.current).toHaveProperty('candles')
    expect(result.current).toHaveProperty('signals')
    expect(result.current).toHaveProperty('lastRefresh')
  })
})
