// ─── NEXUS SENTINEL BOT ─────────────────────────────────────
// System monitoring, health checks, and veto engine.
//
// Architecture:
//   - Monitor: periodic health checks (providers, data, memory)
//   - Veto: blocks Trader signals when conditions are unsafe
//   - Shared: uses @nexus/shared-infra for health state
//
// Future: runs as standalone process, communicates with
// Analyst and Trader bots via shared state or message bus.

export { startMonitor, stopMonitor, getMonitorEvents, getHealthSnapshot } from './monitor'
export type { MonitorConfig, MonitorEvent } from './monitor'

export { evaluateVeto } from './veto'
export type { VetoConfig, VetoDecision, VetoCheck } from './veto'

// Re-export shared health types for convenience
export type { HealthStatus, ComponentHealth, SystemHealth } from '@nexus/shared-infra'
