import { describe, it, expect, afterEach } from 'vitest'
import { startMonitor, stopMonitor, getMonitorEvents, getHealthSnapshot } from '../../apps/sentinel/src/monitor'

describe('Sentinel Monitor', () => {
  afterEach(() => {
    stopMonitor()
  })

  it('starts and stops without error', () => {
    expect(() => startMonitor({ intervalMs: 60000 })).not.toThrow()
    expect(() => stopMonitor()).not.toThrow()
  })

  it('does not crash when started twice', () => {
    startMonitor({ intervalMs: 60000 })
    expect(() => startMonitor({ intervalMs: 60000 })).not.toThrow()
  })

  it('returns empty events array initially', () => {
    const events = getMonitorEvents()
    expect(Array.isArray(events)).toBe(true)
  })

  it('getHealthSnapshot returns valid SystemHealth', () => {
    startMonitor({ intervalMs: 60000 })
    const health = getHealthSnapshot()
    expect(health).toHaveProperty('overall')
    expect(health).toHaveProperty('uptime')
    expect(health).toHaveProperty('components')
    expect(health).toHaveProperty('lastCheck')
    expect(['healthy', 'degraded', 'down']).toContain(health.overall)
  })

  it('registers sentinel_monitor component after start', () => {
    startMonitor({ intervalMs: 60000 })
    const health = getHealthSnapshot()
    const sentinel = health.components.find((c) => c.name === 'sentinel_monitor')
    expect(sentinel).toBeDefined()
    expect(sentinel!.status).toBe('healthy')
  })

  it('stopMonitor is safe to call when not running', () => {
    expect(() => stopMonitor()).not.toThrow()
  })
})
