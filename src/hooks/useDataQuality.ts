import { useMarketStore } from '@/store/market'

export const useDataQuality = () => {
  const quality = useMarketStore((s) => s.quality)
  const readiness = useMarketStore((s) => s.readiness)
  return { quality, readiness }
}
