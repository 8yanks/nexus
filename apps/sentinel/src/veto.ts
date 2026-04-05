// ─── VETO ENGINE ────────────────────────────────────────────
// Future: evaluates whether a Trader bot signal should be blocked.
// The Sentinel has VETO power over all trade executions.
//
// Veto conditions (planned):
// - System health is 'degraded' or 'down'
// - Data freshness below threshold
// - Drawdown limit exceeded
// - Correlation risk too high
// - Max concurrent positions reached

import type { SystemHealth, HealthStatus } from '@nexus/shared-infra'

// ─── TYPES ─────────────────────────────────────────────────

export interface VetoConfig {
  maxDrawdownPct: number          // block trades if drawdown exceeds (default 5%)
  minHealthStatus: HealthStatus   // minimum system health to allow trades
  maxOpenPositions: number        // max concurrent positions allowed
}

export interface VetoDecision {
  allowed: boolean
  reason: string | null
  timestamp: string
  checks: VetoCheck[]
}

export interface VetoCheck {
  name: string
  passed: boolean
  detail: string
}

// ─── DEFAULTS ──────────────────────────────────────────────

const DEFAULT_CONFIG: VetoConfig = {
  maxDrawdownPct: 5,
  minHealthStatus: 'healthy',
  maxOpenPositions: 5,
}

// ─── ENGINE ────────────────────────────────────────────────

const STATUS_RANK: Record<HealthStatus, number> = {
  healthy: 2,
  degraded: 1,
  down: 0,
}

export const evaluateVeto = (
  health: SystemHealth,
  currentDrawdownPct: number,
  openPositions: number,
  overrides: Partial<VetoConfig> = {},
): VetoDecision => {
  const config = { ...DEFAULT_CONFIG, ...overrides }
  const checks: VetoCheck[] = []

  // Check 1: System health
  const healthOk = STATUS_RANK[health.overall] >= STATUS_RANK[config.minHealthStatus]
  checks.push({
    name: 'system_health',
    passed: healthOk,
    detail: `System is ${health.overall}, minimum required: ${config.minHealthStatus}`,
  })

  // Check 2: Drawdown
  const drawdownOk = currentDrawdownPct <= config.maxDrawdownPct
  checks.push({
    name: 'drawdown_limit',
    passed: drawdownOk,
    detail: `Drawdown ${currentDrawdownPct.toFixed(2)}% (max ${config.maxDrawdownPct}%)`,
  })

  // Check 3: Position count
  const positionsOk = openPositions < config.maxOpenPositions
  checks.push({
    name: 'max_positions',
    passed: positionsOk,
    detail: `${openPositions} open (max ${config.maxOpenPositions})`,
  })

  const allPassed = checks.every((c) => c.passed)
  const failedCheck = checks.find((c) => !c.passed)

  return {
    allowed: allPassed,
    reason: allPassed ? null : `VETO: ${failedCheck!.name} — ${failedCheck!.detail}`,
    timestamp: new Date().toISOString(),
    checks,
  }
}
