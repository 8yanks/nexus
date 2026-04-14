import type { TradeDecision, SentinelVeto } from '@/types/decision'
import type { PaperOrder } from '@/types/order'
import type { AuditEntry } from '@/types/audit'
import { idbGetAll, idbPut, idbPutBatch, idbClear, STORES } from './db'

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

export const clearChainStores = async (): Promise<void> => {
  await idbClear(STORES.DECISIONS)
  await idbClear(STORES.VETOS)
  await idbClear(STORES.ORDERS)
  await idbClear(STORES.AUDIT)
}
