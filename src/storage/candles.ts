import type { OHLCV, CandleSeries } from '@/types'
import { STORES, idbPutBatch, idbGetAll } from './db'

// ─── PERSISTED CANDLE (flat row for IndexedDB) ──────────────

interface PersistedCandle extends OHLCV {
  instrumentId: string
  timeframe: string
}

// ─── WRITE ──────────────────────────────────────────────────

export const saveCandleSeries = async (series: CandleSeries): Promise<void> => {
  const rows: PersistedCandle[] = series.candles.map((c) => ({
    ...c,
    instrumentId: series.instrumentId,
    timeframe: series.timeframe,
  }))
  return idbPutBatch(STORES.CANDLES, rows)
}

export const saveAllCandles = async (
  candlesMap: Record<string, CandleSeries>,
): Promise<void> => {
  const allRows: PersistedCandle[] = []
  for (const series of Object.values(candlesMap)) {
    for (const c of series.candles) {
      allRows.push({
        ...c,
        instrumentId: series.instrumentId,
        timeframe: series.timeframe,
      })
    }
  }
  return idbPutBatch(STORES.CANDLES, allRows)
}

// ─── READ ───────────────────────────────────────────────────

export const getCandlesForInstrument = async (
  instrumentId: string,
  timeframe: string,
): Promise<OHLCV[]> => {
  const rows = await idbGetAll<PersistedCandle>(
    STORES.CANDLES,
    'by_instrument_tf',
    [instrumentId, timeframe],
  )
  // Sort by timestamp ascending
  rows.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  return rows
}

export const getCandleCount = async (): Promise<number> => {
  const all = await idbGetAll<PersistedCandle>(STORES.CANDLES)
  return all.length
}
