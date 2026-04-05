import type { MarketSnapshot, Instrument } from '@/types'

const escapeCSV = (val: string): string => {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

const row = (values: (string | number | null | undefined)[]): string =>
  values.map((v) => (v == null ? '' : escapeCSV(String(v)))).join(',')

export const snapshotsToCSV = (
  instruments: Instrument[],
  snapshots: Record<string, MarketSnapshot>,
): string => {
  const header = row([
    'instrument_id', 'symbol', 'asset_class', 'exchange',
    'price', 'bid', 'ask', 'spread_bps',
    'change_24h_pct', 'high_24h', 'low_24h', 'volume_24h',
    'open_interest', 'funding_rate',
    '_source', '_status',
    'provenance_source', 'provenance_method', 'provenance_latency_ms',
    'quality_completeness', 'quality_timeliness', 'quality_accuracy', 'quality_consistency',
    'exported_at',
  ])

  const now = new Date().toISOString()
  const rows = instruments
    .filter((i) => snapshots[i.id])
    .map((i) => {
      const s = snapshots[i.id]
      return row([
        i.id, i.symbol, i.assetClass, i.exchange,
        s.price, s.bid, s.ask, s.spreadBps,
        s.change24hPct, s.high24h, s.low24h, s.volume24h,
        s.openInterest, s.fundingRate,
        s._source, s._status,
        s._provenance.source, s._provenance.fetchMethod, s._provenance.latencyMs,
        s._quality.completeness, s._quality.timeliness, s._quality.accuracy, s._quality.consistency,
        now,
      ])
    })

  return [header, ...rows].join('\n')
}

export const downloadCSV = (filename: string, csvContent: string): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
