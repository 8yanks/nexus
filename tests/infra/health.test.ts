import { describe, it, expect } from 'vitest'
import {
  updateComponentHealth,
  getSystemHealth,
  getComponentHealth,
  markHealthy,
  markDegraded,
  markDown,
} from '@/infra/health'

describe('Health Monitor', () => {
  it('starts with healthy overall status', () => {
    const health = getSystemHealth()
    expect(health.overall).toBe('healthy')
    expect(health.uptime).toBeGreaterThanOrEqual(0)
  })

  it('tracks individual component health', () => {
    markHealthy('test-ws', 5, { connected: true })
    const comp = getComponentHealth('test-ws')
    expect(comp).not.toBeNull()
    expect(comp!.status).toBe('healthy')
    expect(comp!.latencyMs).toBe(5)
    expect(comp!.error).toBeNull()
    expect(comp!.details.connected).toBe(true)
  })

  it('marks degraded with reason', () => {
    markDegraded('test-db', 'High latency')
    const comp = getComponentHealth('test-db')
    expect(comp!.status).toBe('degraded')
    expect(comp!.error).toBe('High latency')
  })

  it('marks down with error', () => {
    markDown('test-api', 'Connection refused')
    const comp = getComponentHealth('test-api')
    expect(comp!.status).toBe('down')
    expect(comp!.error).toBe('Connection refused')
  })

  it('overall status reflects worst component', () => {
    // Reset prior components to healthy to isolate this test
    markHealthy('test-ws', 1)
    markHealthy('test-db', 1)
    markHealthy('test-api', 1)
    markHealthy('full-test', 1)

    markHealthy('comp-a', 1)
    markDegraded('comp-b', 'slow')
    let health = getSystemHealth()
    expect(health.overall).toBe('degraded')

    markDown('comp-c', 'crash')
    health = getSystemHealth()
    expect(health.overall).toBe('down')
  })

  it('returns null for unknown component', () => {
    expect(getComponentHealth('nonexistent')).toBeNull()
  })

  it('updateComponentHealth sets all fields', () => {
    updateComponentHealth('full-test', 'healthy', 42, null, { foo: 'bar' })
    const comp = getComponentHealth('full-test')
    expect(comp!.name).toBe('full-test')
    expect(comp!.status).toBe('healthy')
    expect(comp!.latencyMs).toBe(42)
    expect(comp!.error).toBeNull()
    expect(comp!.details.foo).toBe('bar')
    expect(comp!.lastCheck).toBeTruthy()
  })
})
