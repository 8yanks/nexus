import type { MarketSnapshot } from '@/types'
import { STORES, idbPut, idbPutBatch, idbGetAll, idbCount, idbPruneByTimestamp } from './db'

// ─── PERSISTED SNAPSHOT (adds timestamp key) ────────────────

interface PersistedSnapshot extends MarketSnapshot {
  timestamp: string   // ISO — used as part of compound key
}

const toPersistedSnapshot = (snap: MarketSnapshot): PersistedSnapshot => ({
  ...snap,
  timestamp: snap._provenance.timestamp,
})

// ─── WRITE ──────────────────────────────────────────────────

export const saveSnapshot = async (snap: MarketSnapshot): Promise<void> =>
  idbPut(STORES.SNAPSHOTS, toPersistedSnapshot(snap))

export const saveSnapshots = async (
  snapshots: Record<string, MarketSnapshot>,
): Promise<void> => {
  const values = Object.values(snapshots).map(toPersistedSnapshot)
  return idbPutBatch(STORES.SNAPSHOTS, values)
}

// ─── READ ───────────────────────────────────────────────────

export const getSnapshotsForInstrument = async (
  instrumentId: string,
): Promise<MarketSnapshot[]> =>
  idbGetAll<MarketSnapshot>(STORES.SNAPSHOTS, 'by_instrument', instrumentId)

export const getSnapshotsSince = async (
  instrumentId: string,
  sinceIso: string,
): Promise<MarketSnapshot[]> => {
  const all = await getSnapshotsForInstrument(instrumentId)
  return all.filter((s) => s._provenance.timestamp >= sinceIso)
}

export const getSnapshotCount = async (): Promise<number> =>
  idbCount(STORES.SNAPSHOTS)

// ─── MAINTENANCE ────────────────────────────────────────────

const DEFAULT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export const pruneOldSnapshots = async (
  retentionMs = DEFAULT_RETENTION_MS,
): Promise<number> => {
  const cutoff = new Date(Date.now() - retentionMs).toISOString()
  return idbPruneByTimestamp(STORES.SNAPSHOTS, cutoff)
}
