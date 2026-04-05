// ─── SENTINEL MONITOR ───────────────────────────────────────
// Core monitoring loop: periodically checks provider health,
// data freshness, WebSocket status, and memory usage.
// Reports via shared-infra health system.

import {
  getSystemHealth,
  markHealthy,
  markDegraded,
  type SystemHealth,
  type HealthStatus,
} from '@nexus/shared-infra'

// ─── TYPES ─────────────────────────────────────────────────

export interface MonitorConfig {
  intervalMs: number           // poll interval (default 10s)
  freshnessThresholdMs: number // data older than this = stale (default 30s)
  memoryWarnPct: number        // heap usage warning threshold (default 0.85)
}

export interface MonitorEvent {
  timestamp: string
  component: string
  previousStatus: HealthStatus
  newStatus: HealthStatus
  message: string
}

// ─── DEFAULTS ──────────────────────────────────────────────

const DEFAULT_CONFIG: MonitorConfig = {
  intervalMs: 10_000,
  freshnessThresholdMs: 30_000,
  memoryWarnPct: 0.85,
}

// ─── STATE ─────────────────────────────────────────────────

let intervalId: ReturnType<typeof setInterval> | null = null
const events: MonitorEvent[] = []
const MAX_EVENTS = 200

const addEvent = (component: string, previousStatus: HealthStatus, newStatus: HealthStatus, message: string): void => {
  events.push({
    timestamp: new Date().toISOString(),
    component,
    previousStatus,
    newStatus,
    message,
  })
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS)
}

// ─── CHECKS ────────────────────────────────────────────────

const checkMemory = (config: MonitorConfig): void => {
  try {
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory
    if (mem) {
      const usedMb = mem.usedJSHeapSize / (1024 * 1024)
      const limitMb = mem.jsHeapSizeLimit / (1024 * 1024)
      const pct = usedMb / limitMb
      if (pct > config.memoryWarnPct) {
        markDegraded('memory', `Heap usage at ${(pct * 100).toFixed(0)}%`, { usedMb: Math.round(usedMb), limitMb: Math.round(limitMb) })
      } else {
        markHealthy('memory', 0, { usedMb: Math.round(usedMb) })
      }
    }
  } catch {
    // Not all environments support performance.memory
  }
}

const runChecks = (config: MonitorConfig): void => {
  checkMemory(config)
  // Future: check provider endpoints, data freshness, WebSocket connections
}

// ─── PUBLIC API ────────────────────────────────────────────

export const startMonitor = (overrides: Partial<MonitorConfig> = {}): void => {
  if (intervalId) return
  const config = { ...DEFAULT_CONFIG, ...overrides }

  // Run once immediately
  runChecks(config)

  intervalId = setInterval(() => runChecks(config), config.intervalMs)
  markHealthy('sentinel_monitor', 0, { intervalMs: config.intervalMs })
}

export const stopMonitor = (): void => {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

export const getMonitorEvents = (): MonitorEvent[] => [...events]

export const getHealthSnapshot = (): SystemHealth => getSystemHealth()

export { addEvent as _addEvent }
