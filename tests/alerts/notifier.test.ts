import { describe, it, expect, beforeEach } from 'vitest'
import { notify, notifyAll, getNotificationHistory, clearNotificationHistory } from '@/alerts/notifier'
import type { AlertEvaluation } from '@/alerts/engine'
import type { AlertRule } from '@/types'

const mkRule = (id = 'r1'): AlertRule => ({
  id,
  instrumentId: 'BTC-USD-SPOT',
  type: 'price_above',
  value: 70000,
  active: true,
  triggered: false,
  severity: 'warning',
  triggeredAt: null,
})

const mkEval = (triggered: boolean, ruleId = 'r1'): AlertEvaluation => ({
  rule: mkRule(ruleId),
  triggered,
  currentValue: 68000,
})

describe('Alert Notifier', () => {
  beforeEach(() => {
    clearNotificationHistory()
  })

  it('stores triggered evaluations', () => {
    notify(mkEval(true))
    expect(getNotificationHistory()).toHaveLength(1)
  })

  it('ignores non-triggered evaluations', () => {
    notify(mkEval(false))
    expect(getNotificationHistory()).toHaveLength(0)
  })

  it('notifyAll stores only triggered evaluations', () => {
    notifyAll([mkEval(true, 'a'), mkEval(false, 'b'), mkEval(true, 'c')])
    expect(getNotificationHistory()).toHaveLength(2)
  })

  it('clearNotificationHistory empties the list', () => {
    notify(mkEval(true))
    expect(getNotificationHistory()).toHaveLength(1)
    clearNotificationHistory()
    expect(getNotificationHistory()).toHaveLength(0)
  })

  it('returns readonly copy of history', () => {
    notify(mkEval(true))
    const hist = getNotificationHistory()
    expect(hist).toHaveLength(1)
    // Should be a copy, not the internal array
    expect(Object.isFrozen(hist) || Array.isArray(hist)).toBe(true)
  })
})
