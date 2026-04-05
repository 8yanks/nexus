import type { MarketSnapshot, Instrument } from '@/types'
import type { AnalyticsResult } from '@/analytics/indicators'
import type { SignalEvent } from '@/types'
import type { DataQualityReport } from '@/types'

export interface ExportPayload {
  exportedAt: string
  instrumentCount: number
  instruments: Instrument[]
  snapshots: Record<string, MarketSnapshot>
  analytics: Record<string, AnalyticsResult | null>
  signals: SignalEvent[]
  quality: Record<string, DataQualityReport>
  _meta: {
    version: string
    source: string
  }
}

export const buildExportPayload = (
  instruments: Instrument[],
  snapshots: Record<string, MarketSnapshot>,
  analytics: Record<string, AnalyticsResult | null>,
  signals: SignalEvent[],
  quality: Record<string, DataQualityReport>,
): ExportPayload => ({
  exportedAt: new Date().toISOString(),
  instrumentCount: instruments.length,
  instruments,
  snapshots,
  analytics,
  signals,
  quality,
  _meta: {
    version: '1.0.0',
    source: 'nexus_market_monitor',
  },
})

export const downloadJSON = (filename: string, payload: ExportPayload): void => {
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
