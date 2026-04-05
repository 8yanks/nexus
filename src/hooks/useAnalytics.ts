import { useMarketStore } from '@/store/market'

export const useAnalytics = (instrumentId: string | null) => {
  const analytics = useMarketStore((s) =>
    instrumentId ? s.analytics[instrumentId] ?? null : null,
  )
  const structure = useMarketStore((s) =>
    instrumentId ? s.structures[instrumentId] ?? null : null,
  )
  const volatility = useMarketStore((s) =>
    instrumentId ? s.volatility[instrumentId] ?? null : null,
  )

  return { analytics, structure, volatility }
}
