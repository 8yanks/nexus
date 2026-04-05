import { describe, it, expect } from 'vitest'
import { evaluateVeto } from '../../apps/sentinel/src/veto'
import type { SystemHealth } from '@nexus/shared-infra'

// ─── HELPERS ──────────────────────────────────────────────

const mkHealth = (overall: SystemHealth['overall']): SystemHealth => ({
  overall,
  uptime: 100,
  components: [],
  lastCheck: new Date().toISOString(),
})

// ─── TESTS ────────────────────────────────────────────────

describe('Sentinel Veto Engine', () => {
  it('allows trade when all conditions pass', () => {
    const result = evaluateVeto(mkHealth('healthy'), 1.0, 2)
    expect(result.allowed).toBe(true)
    expect(result.reason).toBeNull()
    expect(result.checks).toHaveLength(3)
    expect(result.checks.every((c) => c.passed)).toBe(true)
  })

  it('vetoes when system is down', () => {
    const result = evaluateVeto(mkHealth('down'), 0, 0)
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('system_health')
  })

  it('vetoes when system is degraded (default requires healthy)', () => {
    const result = evaluateVeto(mkHealth('degraded'), 0, 0)
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('system_health')
  })

  it('allows degraded when minHealthStatus is degraded', () => {
    const result = evaluateVeto(mkHealth('degraded'), 0, 0, { minHealthStatus: 'degraded' })
    expect(result.allowed).toBe(true)
  })

  it('vetoes when drawdown exceeds limit', () => {
    const result = evaluateVeto(mkHealth('healthy'), 6.5, 0)
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('drawdown_limit')
    expect(result.reason).toContain('6.50%')
  })

  it('allows drawdown at exactly the limit', () => {
    const result = evaluateVeto(mkHealth('healthy'), 5.0, 0)
    expect(result.allowed).toBe(true)
  })

  it('vetoes when max positions reached', () => {
    const result = evaluateVeto(mkHealth('healthy'), 0, 5)
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('max_positions')
  })

  it('allows positions below limit', () => {
    const result = evaluateVeto(mkHealth('healthy'), 0, 4)
    expect(result.allowed).toBe(true)
  })

  it('reports first failed check as reason', () => {
    // Both health and drawdown fail — health is checked first
    const result = evaluateVeto(mkHealth('down'), 10, 10)
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('system_health')
  })

  it('respects custom config overrides', () => {
    const result = evaluateVeto(mkHealth('healthy'), 8.0, 8, {
      maxDrawdownPct: 10,
      maxOpenPositions: 10,
    })
    expect(result.allowed).toBe(true)
  })

  it('includes timestamp in decision', () => {
    const before = new Date().toISOString()
    const result = evaluateVeto(mkHealth('healthy'), 0, 0)
    expect(result.timestamp >= before).toBe(true)
  })

  it('returns 3 checks in every decision', () => {
    const result = evaluateVeto(mkHealth('healthy'), 0, 0)
    expect(result.checks).toHaveLength(3)
    const names = result.checks.map((c) => c.name)
    expect(names).toContain('system_health')
    expect(names).toContain('drawdown_limit')
    expect(names).toContain('max_positions')
  })
})
