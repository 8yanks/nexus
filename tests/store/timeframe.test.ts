import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useMarketStore } from '@/store/market'
import {
  TIMEFRAME_STORAGE_KEY,
  loadTimeframeState,
  type Timeframe,
} from '@/ui/timeframe-memory'

// ─── STORE — selectedTimeframe + setTimeframe ────────────────
// Validates the multi-timeframe wiring on the market store:
//   - the field defaults to '1h' when nothing is persisted,
//   - setTimeframe persists to localStorage,
//   - setTimeframe triggers an immediate refreshAll so the chart
//     updates within the same paint instead of waiting for the next tick,
//   - setting the picker to the active TF is a no-op (no extra refresh,
//     no extra storage write).

describe('useMarketStore — selectedTimeframe / setTimeframe', () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
    // Reset the field but leave the original action intact — individual
    // tests stub `refreshAll` to assert the action was called.
    useMarketStore.setState({
      selectedTimeframe: '1h',
      refreshAll: vi.fn().mockResolvedValue(undefined) as never,
    })
  })

  it('starts at 1h when nothing is persisted', () => {
    expect(useMarketStore.getState().selectedTimeframe).toBe('1h')
  })

  it('setTimeframe updates the field', () => {
    useMarketStore.getState().setTimeframe('5m')
    expect(useMarketStore.getState().selectedTimeframe).toBe('5m')
  })

  it('setTimeframe persists the choice to localStorage', () => {
    useMarketStore.getState().setTimeframe('15m')
    const raw = globalThis.localStorage.getItem(TIMEFRAME_STORAGE_KEY)
    expect(raw).toBe(JSON.stringify('15m'))
    expect(loadTimeframeState()).toBe('15m')
  })

  it('setTimeframe triggers an immediate refreshAll', () => {
    const refreshAll = useMarketStore.getState().refreshAll as unknown as ReturnType<typeof vi.fn>
    useMarketStore.getState().setTimeframe('4h')
    expect(refreshAll).toHaveBeenCalledTimes(1)
  })

  it('setTimeframe is a no-op when the picker is already on the chosen TF', () => {
    const refreshAll = useMarketStore.getState().refreshAll as unknown as ReturnType<typeof vi.fn>
    // Already at '1h' — clicking the active pill should not re-trigger.
    useMarketStore.getState().setTimeframe('1h')
    expect(refreshAll).not.toHaveBeenCalled()
    // And no storage write either — no need to thrash the disk on idle clicks.
    expect(globalThis.localStorage.getItem(TIMEFRAME_STORAGE_KEY)).toBeNull()
  })

  it('cycling through every valid TF persists each one', () => {
    const tfs: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d']
    for (const tf of tfs) {
      useMarketStore.getState().setTimeframe(tf)
      expect(useMarketStore.getState().selectedTimeframe).toBe(tf)
      expect(loadTimeframeState()).toBe(tf)
    }
  })
})
