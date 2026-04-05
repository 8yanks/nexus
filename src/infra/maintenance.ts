// ─── AUTO-MAINTENANCE ───────────────────────────────────────
// Periodic tasks: prune old data, check provider health, log metrics.
// Runs on a timer — does NOT block the UI refresh cycle.

import { pruneOldSnapshots } from '@/storage/snapshots'
import { pruneOldSignals } from '@/storage/signals'
import { config } from './env'
import { getSystemHealth, markHealthy, markDegraded } from './health'

export interface MaintenanceLog {
  task: string
  timestamp: string
  durationMs: number
  result: 'ok' | 'error'
  detail: string
}

const logs: MaintenanceLog[] = []
const MAX_LOGS = 100

const addLog = (task: string, durationMs: number, result: 'ok' | 'error', detail: string): void => {
  logs.push({ task, timestamp: new Date().toISOString(), durationMs, result, detail })
  if (logs.length > MAX_LOGS) logs.splice(0, logs.length - MAX_LOGS)
}

// ─── TASKS ──────────────────────────────────────────────────

const pruneStorage = async (): Promise<void> => {
  const t0 = Date.now()
  try {
    await pruneOldSnapshots(config.idbRetentionDays)
    await pruneOldSignals(config.signalRetentionDays)
    const ms = Date.now() - t0
    addLog('prune_storage', ms, 'ok', `Pruned snapshots (${config.idbRetentionDays}d) and signals (${config.signalRetentionDays}d)`)
    markHealthy('indexeddb', ms, { lastPrune: new Date().toISOString() })
  } catch (err) {
    const ms = Date.now() - t0
    const msg = err instanceof Error ? err.message : String(err)
    addLog('prune_storage', ms, 'error', msg)
    markDegraded('indexeddb', msg)
  }
}

const checkMemory = (): void => {
  const t0 = Date.now()
  try {
    // performance.memory is Chrome-only but safe to check
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory
    if (mem) {
      const usedMb = mem.usedJSHeapSize / (1024 * 1024)
      const limitMb = mem.jsHeapSizeLimit / (1024 * 1024)
      const pct = usedMb / limitMb
      if (pct > 0.85) {
        markDegraded('memory', `Heap usage at ${(pct * 100).toFixed(0)}%`, { usedMb: Math.round(usedMb), limitMb: Math.round(limitMb) })
      } else {
        markHealthy('memory', Date.now() - t0, { usedMb: Math.round(usedMb) })
      }
    }
  } catch {
    // Ignore — not all browsers support performance.memory
  }
}

// ─── SCHEDULER ──────────────────────────────────────────────

let intervalId: ReturnType<typeof setInterval> | null = null

export const startMaintenance = (intervalMinutes = 5): void => {
  if (intervalId) return

  // Run once immediately
  runMaintenance()

  intervalId = setInterval(runMaintenance, intervalMinutes * 60000)
}

export const stopMaintenance = (): void => {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

const runMaintenance = (): void => {
  pruneStorage()
  checkMemory()
}

// ─── READ LOGS ──────────────────────────────────────────────

export const getMaintenanceLogs = (): MaintenanceLog[] => [...logs]
