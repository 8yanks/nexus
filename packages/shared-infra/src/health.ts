// ─── HEALTH MONITOR ─────────────────────────────────────────
// Tracks system health: providers, WebSocket, IndexedDB, refresh cycle.
// Pure in-memory — no side effects, no persistence.

export type HealthStatus = 'healthy' | 'degraded' | 'down'

export interface ComponentHealth {
  name: string
  status: HealthStatus
  lastCheck: string
  latencyMs: number
  error: string | null
  details: Record<string, string | number | boolean>
}

export interface SystemHealth {
  overall: HealthStatus
  uptime: number                     // seconds since startup
  components: ComponentHealth[]
  lastCheck: string
}

// ─── STATE ──────────────────────────────────────────────────

const startTime = Date.now()
const components: Map<string, ComponentHealth> = new Map()

// ─── API ────────────────────────────────────────────────────

export const updateComponentHealth = (
  name: string,
  status: HealthStatus,
  latencyMs = 0,
  error: string | null = null,
  details: Record<string, string | number | boolean> = {},
): void => {
  components.set(name, {
    name,
    status,
    lastCheck: new Date().toISOString(),
    latencyMs,
    error,
    details,
  })
}

export const getSystemHealth = (): SystemHealth => {
  const all = [...components.values()]
  const hasDown = all.some((c) => c.status === 'down')
  const hasDegraded = all.some((c) => c.status === 'degraded')

  return {
    overall: hasDown ? 'down' : hasDegraded ? 'degraded' : 'healthy',
    uptime: (Date.now() - startTime) / 1000,
    components: all,
    lastCheck: new Date().toISOString(),
  }
}

export const getComponentHealth = (name: string): ComponentHealth | null =>
  components.get(name) ?? null

// ─── CONVENIENCE ────────────────────────────────────────────

export const markHealthy = (name: string, latencyMs = 0, details?: Record<string, string | number | boolean>): void =>
  updateComponentHealth(name, 'healthy', latencyMs, null, details)

export const markDegraded = (name: string, reason: string, details?: Record<string, string | number | boolean>): void =>
  updateComponentHealth(name, 'degraded', 0, reason, details)

export const markDown = (name: string, error: string): void =>
  updateComponentHealth(name, 'down', 0, error)
