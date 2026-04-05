import type { SignalEvent } from '@/types'
import { STORES, idbPutBatch, idbGetAll, idbCount, idbPruneByTimestamp } from './db'

// ─── WRITE ──────────────────────────────────────────────────

export const saveSignals = async (signals: SignalEvent[]): Promise<void> => {
  if (signals.length === 0) return
  return idbPutBatch(STORES.SIGNALS, signals)
}

// ─── READ ───────────────────────────────────────────────────

export const getAllSignals = async (): Promise<SignalEvent[]> =>
  idbGetAll<SignalEvent>(STORES.SIGNALS)

export const getSignalsForInstrument = async (
  instrumentId: string,
): Promise<SignalEvent[]> =>
  idbGetAll<SignalEvent>(STORES.SIGNALS, 'by_instrument', instrumentId)

export const getSignalsByType = async (
  type: string,
): Promise<SignalEvent[]> =>
  idbGetAll<SignalEvent>(STORES.SIGNALS, 'by_type', type)

export const getSignalCount = async (): Promise<number> =>
  idbCount(STORES.SIGNALS)

// ─── MAINTENANCE ────────────────────────────────────────────

const DEFAULT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export const pruneOldSignals = async (
  retentionMs = DEFAULT_RETENTION_MS,
): Promise<number> => {
  const cutoff = new Date(Date.now() - retentionMs).toISOString()
  return idbPruneByTimestamp(STORES.SIGNALS, cutoff)
}
