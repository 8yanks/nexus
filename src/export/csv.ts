import type { MarketSnapshot, Instrument } from '@/types'
import type { BacktestResult, BacktestTrade } from '@/backtest/types'

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

// ─── BACKTEST TRADES → CSV ──────────────────────────────────
//
// One row per trade. Columns mirror the BacktestTrade interface plus
// the parent config's `instrumentId` so a downstream tool can join
// across multiple backtests. Empty `trades` produces a header-only
// file rather than throwing — the user still gets a valid spreadsheet.

const tradeRow = (instrumentId: string, t: BacktestTrade): string =>
  row([
    instrumentId,
    t.id,
    t.direction,
    t.entrySignal,
    t.entryIndex,
    t.entryTimestamp,
    t.entryPrice,
    t.exitIndex,
    t.exitTimestamp,
    t.exitPrice,
    t.exitReason,
    t.bars,
    t.pnl,
    t.pnlPct,
    t.commission,
    t.maxFavorable,
    t.maxAdverse,
  ])

export const tradesToCSV = (result: BacktestResult): string => {
  const header = row([
    'instrument_id',
    'trade_id',
    'direction',
    'entry_signal',
    'entry_index',
    'entry_timestamp',
    'entry_price',
    'exit_index',
    'exit_timestamp',
    'exit_price',
    'exit_reason',
    'bars',
    'pnl',
    'pnl_pct',
    'commission',
    'max_favorable_excursion',
    'max_adverse_excursion',
  ])
  const rows = result.trades.map((t) => tradeRow(result.config.instrumentId, t))
  return [header, ...rows].join('\n')
}
