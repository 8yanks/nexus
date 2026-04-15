import type { TradeDecision, SentinelVeto } from '@/types/decision'
import type { PaperOrder } from '@/types/order'
import type { AuditEntry } from '@/types/audit'
import type { Position } from '@/types/position'
import { idbGetAll, idbPut, idbPutBatch, idbClear, idbPruneByTimestamp, STORES } from './db'

export const saveDecision = (d: TradeDecision) =>
  idbPut(STORES.DECISIONS, d)

export const saveVeto = (v: SentinelVeto) => idbPut(STORES.VETOS, v)

export const saveOrder = (o: PaperOrder) => idbPut(STORES.ORDERS, o)

export const saveAuditEntries = (entries: AuditEntry[]) =>
  idbPutBatch(STORES.AUDIT, entries)

export const loadDecisions = () =>
  idbGetAll<TradeDecision>(STORES.DECISIONS)

export const loadVetos = () => idbGetAll<SentinelVeto>(STORES.VETOS)
export const loadOrders = () => idbGetAll<PaperOrder>(STORES.ORDERS)
export const loadAuditEntries = () => idbGetAll<AuditEntry>(STORES.AUDIT)

export const savePosition = (p: Position) => idbPut(STORES.POSITIONS, p)
export const loadPositions = () => idbGetAll<Position>(STORES.POSITIONS)

export const clearChainStores = async (): Promise<void> => {
  await idbClear(STORES.DECISIONS)
  await idbClear(STORES.VETOS)
  await idbClear(STORES.ORDERS)
  await idbClear(STORES.AUDIT)
  await idbClear(STORES.POSITIONS)
}

// ─── PRUNING ────────────────────────────────────────────────
// Chain stores use numeric (ms) timestamps; the generic pruner's
// IDBKeyRange.upperBound works transparently on numbers too.

export const pruneOldDecisions = (retentionDays = 30): Promise<number> => {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000
  return idbPruneByTimestamp(STORES.DECISIONS, cutoff)
}

export const pruneOldVetos = (retentionDays = 30): Promise<number> => {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000
  return idbPruneByTimestamp(STORES.VETOS, cutoff)
}

export const pruneOldOrders = (retentionDays = 30): Promise<number> => {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000
  return idbPruneByTimestamp(STORES.ORDERS, cutoff)
}

export const pruneOldAudit = (retentionDays = 7): Promise<number> => {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000
  return idbPruneByTimestamp(STORES.AUDIT, cutoff)
}
