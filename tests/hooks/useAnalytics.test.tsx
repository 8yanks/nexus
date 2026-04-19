import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useMarketStore } from '@/store/market'

beforeEach(() => {
  useMarketStore.setState({ analytics: {}, structures: {}, volatility: {} })
})

describe('useAnalytics', () => {
  it('returns nulls for every slice when instrumentId is null', () => {
    const { result } = renderHook(() => useAnalytics(null))
    expect(result.current).toEqual({ analytics: null, structure: null, volatility: null })
  })

  it('returns nulls for every slice when the instrument has no analytics yet', () => {
    const { result } = renderHook(() => useAnalytics('btc-unknown'))
    expect(result.current).toEqual({ analytics: null, structure: null, volatility: null })
  })

  it('returns the matching slice for the requested instrument', () => {
    const fakeAnalytics = {
      instrumentId: 'btc',
      rsi: 52,
      ema20: 60_000,
      ema50: 59_500,
      ema200: 58_000,
      atr: 800,
      vwap: 60_100,
      bollinger: null,
      zScore: 0.2,
      relativeVolume: 1.1,
      _source: 'mock',
      _status: 'LIVE' as const,
      generatedAt: '2026-04-19T10:00:00Z',
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useMarketStore.setState({ analytics: { btc: fakeAnalytics as any } })
    const { result } = renderHook(() => useAnalytics('btc'))
    expect(result.current.analytics).toEqual(fakeAnalytics)
  })
})
