import { describe, it, expect } from 'vitest'
import { AuditLogger } from '@/audit/logger'

describe('AuditLogger', () => {
  it('appends and lists entries', () => {
    const log = new AuditLogger()
    log.log('analyst', 'SIGNAL_DETECTED', 'rsi oversold')
    log.log('sentinel', 'SENTINEL_APPROVED', 'ok')
    expect(log.size()).toBe(2)
    expect(log.list({ module: 'sentinel' })).toHaveLength(1)
  })

  it('filters by eventType and since', () => {
    let t = 1000
    const log = new AuditLogger({ now: () => t })
    log.log('ai', 'AI_PROMPT_SENT', 'a')
    t = 2000
    log.log('ai', 'AI_RESPONSE_VALIDATED', 'b')
    expect(log.list({ eventType: 'AI_PROMPT_SENT' })).toHaveLength(1)
    expect(log.list({ since: 1500 })).toHaveLength(1)
  })

  it('ring-buffers beyond maxEntries', () => {
    const log = new AuditLogger({ maxEntries: 3 })
    for (let i = 0; i < 5; i++) log.log('system', 'DATA_RECEIVED', `${i}`)
    expect(log.size()).toBe(3)
    expect(log.list()[0].summary).toBe('2')
  })

  it('notifies subscribers', () => {
    const log = new AuditLogger()
    const seen: string[] = []
    const off = log.subscribe((e) => seen.push(e.summary))
    log.log('trader', 'ORDER_SUBMITTED', 'x')
    off()
    log.log('trader', 'ORDER_FILLED', 'y')
    expect(seen).toEqual(['x'])
  })
})
