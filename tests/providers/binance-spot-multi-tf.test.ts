import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createBinanceSpotProvider } from '@/providers/binance/spot'

// ─── BINANCE SPOT — multi-timeframe REST cache ───────────────
// Validates the per-(instrumentId, timeframe) cache layer behind
// `getCandles`. The 1h path is served from the WS-fed `candles` map
// and bypasses REST entirely; every other TF goes through a TTL-gated
// REST fetch with stale-on-error fallback.
//
// Tests stub global.fetch directly — we only care about the call shape
// and the response branching, not the URL handler internals.

const makeKlinesPayload = (count: number): unknown[] => {
  const now = Date.now()
  return Array.from({ length: count }, (_, i) => [
    now - (count - i) * 60_000, // openTime
    '67000.0',                  // open
    '67500.0',                  // high
    '66800.0',                  // low
    '67200.0',                  // close
    '12.5',                     // volume
    now - (count - i - 1) * 60_000, // closeTime
    '0', 0, '0', '0', '0',
  ])
}

const makeFetchResponse = (body: unknown, ok = true, status = 200): Response =>
  ({
    ok,
    status,
    json: () => Promise.resolve(body),
  }) as Response

describe('binance spot — multi-timeframe getCandles', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('1h timeframe returns the WS-tracked cache without hitting REST', async () => {
    const p = createBinanceSpotProvider()
    // Don't connect — just exercise the read path. With nothing cached
    // we expect an empty CandleSeries, NOT a fetch call.
    const series = await p.getCandles('BTC-USD-SPOT', '1h', 50)
    expect(series.timeframe).toBe('1h')
    expect(series.candles).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('non-1h timeframe fetches via REST and caches the result', async () => {
    fetchMock.mockResolvedValue(makeFetchResponse(makeKlinesPayload(10)))
    const p = createBinanceSpotProvider()
    const series = await p.getCandles('BTC-USD-SPOT', '5m', 10)
    expect(series.timeframe).toBe('5m')
    expect(series.candles).toHaveLength(10)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const calledUrl = fetchMock.mock.calls[0][0] as string
    expect(calledUrl).toContain('interval=5m')
    expect(calledUrl).toContain('symbol=BTCUSDT')
  })

  it('hits the cache instead of REST on the second call within TTL', async () => {
    fetchMock.mockResolvedValue(makeFetchResponse(makeKlinesPayload(10)))
    const p = createBinanceSpotProvider()
    await p.getCandles('BTC-USD-SPOT', '5m', 10)
    await p.getCandles('BTC-USD-SPOT', '5m', 10)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('refetches once the TTL expires', async () => {
    vi.useFakeTimers()
    fetchMock.mockResolvedValue(makeFetchResponse(makeKlinesPayload(10)))
    const p = createBinanceSpotProvider()
    await p.getCandles('BTC-USD-SPOT', '5m', 10)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    // TTL is 60s — advance past it.
    vi.advanceTimersByTime(61_000)
    await p.getCandles('BTC-USD-SPOT', '5m', 10)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('different timeframes use independent cache slots', async () => {
    fetchMock.mockResolvedValue(makeFetchResponse(makeKlinesPayload(10)))
    const p = createBinanceSpotProvider()
    await p.getCandles('BTC-USD-SPOT', '5m', 10)
    await p.getCandles('BTC-USD-SPOT', '15m', 10)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const url5m = fetchMock.mock.calls[0][0] as string
    const url15m = fetchMock.mock.calls[1][0] as string
    expect(url5m).toContain('interval=5m')
    expect(url15m).toContain('interval=15m')
  })

  it('serves stale candles when REST fails after a previous success', async () => {
    fetchMock.mockResolvedValueOnce(makeFetchResponse(makeKlinesPayload(10)))
    const p = createBinanceSpotProvider()
    const fresh = await p.getCandles('BTC-USD-SPOT', '5m', 10)
    expect(fresh.candles).toHaveLength(10)

    // Force a refetch by jumping past TTL.
    vi.useFakeTimers()
    vi.advanceTimersByTime(61_000)
    fetchMock.mockResolvedValueOnce(makeFetchResponse({}, false, 503))

    const stale = await p.getCandles('BTC-USD-SPOT', '5m', 10)
    expect(stale.candles).toHaveLength(10) // served from cache, not empty
  })

  it('throws when there is no cache and REST fails', async () => {
    fetchMock.mockResolvedValue(makeFetchResponse({}, false, 503))
    const p = createBinanceSpotProvider()
    await expect(p.getCandles('BTC-USD-SPOT', '5m', 10)).rejects.toThrow()
  })
})
