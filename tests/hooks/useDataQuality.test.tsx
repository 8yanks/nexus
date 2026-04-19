import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDataQuality } from '@/hooks/useDataQuality'
import { useMarketStore } from '@/store/market'

beforeEach(() => {
  useMarketStore.setState({ quality: {}, readiness: null })
})

describe('useDataQuality', () => {
  it('returns the empty quality map and null readiness by default', () => {
    const { result } = renderHook(() => useDataQuality())
    expect(result.current.quality).toEqual({})
    expect(result.current.readiness).toBeNull()
  })

  it('reflects the current quality + readiness store slices', () => {
    useMarketStore.setState({
      quality: {
        btc: {
          instrumentId: 'btc',
          completeness: 0.9,
          freshness: 0.8,
          reliability: 0.95,
          overallScore: 0.88,
          issues: [],
          _source: 'mock',
          _status: 'LIVE',
          assessedAt: '2026-04-19T10:00:00Z',
        },
      },
      readiness: {
        score: 0.7,
        ready: true,
        instrumentCount: 1,
        liveCount: 1,
        avgCompleteness: 0.9,
        avgFreshness: 0.8,
        avgReliability: 0.95,
        issues: [],
      },
    })
    const { result } = renderHook(() => useDataQuality())
    expect(result.current.quality.btc?.overallScore).toBe(0.88)
    expect(result.current.readiness?.ready).toBe(true)
  })
})
