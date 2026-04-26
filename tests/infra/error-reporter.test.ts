import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  reportError,
  setReporter,
  resetReporter,
  type ErrorReporter,
} from '@/infra/error-reporter'

describe('error-reporter', () => {
  beforeEach(() => {
    resetReporter()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    resetReporter()
  })

  it('default reporter logs to console.error in dev', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    reportError(new Error('boom'))
    expect(spy).toHaveBeenCalled()
    expect(spy.mock.calls[0][0]).toBe('[error-reporter]')
  })

  it('setReporter swaps the active capture handler', () => {
    const captured: Array<{ err: unknown; ctx: unknown }> = []
    const fake: ErrorReporter = {
      capture: (err, ctx) => captured.push({ err, ctx }),
    }
    setReporter(fake)
    const e = new Error('hello')
    reportError(e, { source: 'TestSource', tags: { id: 42 } })
    expect(captured).toHaveLength(1)
    expect(captured[0].err).toBe(e)
    expect(captured[0].ctx).toEqual({ source: 'TestSource', tags: { id: 42 } })
  })

  it('resetReporter restores the default', () => {
    const captured: Array<unknown> = []
    setReporter({ capture: (err) => captured.push(err) })
    resetReporter()
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    reportError(new Error('after reset'))
    expect(captured).toEqual([]) // custom reporter no longer wired
    expect(spy).toHaveBeenCalled() // default kicked in
  })

  it('reportError swallows exceptions thrown by the reporter itself', () => {
    setReporter({
      capture: () => {
        throw new Error('reporter is broken')
      },
    })
    // The whole point of the swallow: if the reporter blows up, it
    // must NEVER take the calling site down with it.
    expect(() => reportError(new Error('original'))).not.toThrow()
  })

  it('passes context through unchanged', () => {
    let received: unknown = null
    setReporter({ capture: (_e, ctx) => (received = ctx) })
    const ctx = {
      source: 'Detail/chart',
      tags: { instrumentId: 'BTC-USD-SPOT', confidence: 0.7 },
      extra: { lastSnapshot: { price: 67000 } },
    }
    reportError(new Error('x'), ctx)
    expect(received).toEqual(ctx)
  })
})
