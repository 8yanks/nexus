import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useMarketStore } from '@/store/market'

export const useMarketData = () => {
  const startAutoRefresh = useMarketStore((s) => s.startAutoRefresh)
  const stopAutoRefresh = useMarketStore((s) => s.stopAutoRefresh)

  useEffect(() => {
    startAutoRefresh(5000)
    return () => stopAutoRefresh()
  }, [startAutoRefresh, stopAutoRefresh])

  return useMarketStore(
    useShallow((s) => ({
      instruments: s.instruments,
      snapshots: s.snapshots,
      candles: s.candles,
      signals: s.signals,
      lastRefresh: s.lastRefresh,
    })),
  )
}
