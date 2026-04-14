import { describe, it, expect } from 'vitest'
import { SentinelEngine } from '@/sentinel/engine'
import type { SentinelContext } from '@/sentinel/engine'
import { AuditLogger } from '@/audit/logger'
import type { TradeDecision } from '@/types/decision'

function decision(overrides: Partial<TradeDecision> = {}): TradeDecision {
  return {
    id: 'd1',
    timestamp: 1,
    instrumentId: 'BTCUSD',
    symbol: 'BTC/USD',
    action: 'BUY',
    size: 0.1,
    entryPrice: 60000,
    stopLoss: 58000,
    takeProfit: 65000,
    confidence: 0.8,
    riskLevel: 'medium',
    horizon: 'intraday',
    thesis: 't',
    keyFactors: [],
    invalidators: [],
    requiresHumanReview: false,
    modelSource: 'm',
    consensusScore: null,
    _source: 's',
    _status: 'LIVE',
    _contextHash: 'h',
    ...overrides,
  }
}

function ctx(overrides: Partial<SentinelContext> = {}): SentinelContext {
  return {
    currentDrawdownPct: 1,
    currentExposurePct: 5,
    positionSizePct: 1,
    dataQualityScore: 0.9,
    dataAgeMs: 1000,
    latencyMs: 200,
    brokerAvailable: true,
    safeMode: false,
    consensusScore: null,
    ...overrides,
  }
}

describe('SentinelEngine', () => {
  it('approves a clean decision', () => {
    const e = new SentinelEngine()
    const v = e.evaluate(decision(), ctx())
    expect(v.approved).toBe(true)
    expect(v.vetoReasons).toEqual([])
  })

  it('vetoes stale data', () => {
    const v = new SentinelEngine().evaluate(decision(), ctx({ dataAgeMs: 60_000 }))
    expect(v.approved).toBe(false)
    expect(v.vetoReasons).toContain('DATA_TOO_OLD')
  })

  it('vetoes multiple failures at once', () => {
    const v = new SentinelEngine().evaluate(
      decision({ confidence: 0.1 }),
      ctx({ dataQualityScore: 0.1, latencyMs: 10_000, brokerAvailable: false }),
    )
    expect(v.approved).toBe(false)
    expect(v.vetoReasons).toEqual(
      expect.arrayContaining([
        'DATA_QUALITY_LOW',
        'LATENCY_TOO_HIGH',
        'MODEL_RESPONSE_INVALID',
        'BROKER_UNAVAILABLE',
      ]),
    )
  })

  it('vetoes when safe mode is active', () => {
    const v = new SentinelEngine().evaluate(decision(), ctx({ safeMode: true }))
    expect(v.vetoReasons).toContain('SAFE_MODE_ACTIVE')
  })

  it('always approves HOLD', () => {
    const v = new SentinelEngine().evaluate(
      decision({ action: 'HOLD', size: 0 }),
      ctx({ safeMode: true, dataAgeMs: 99999 }),
    )
    expect(v.approved).toBe(true)
  })

  it('logs audit events on approval and veto', () => {
    const audit = new AuditLogger()
    const e = new SentinelEngine({ audit })
    e.evaluate(decision(), ctx())
    e.evaluate(decision({ id: 'd2' }), ctx({ dataAgeMs: 99999 }))
    expect(audit.list({ eventType: 'SENTINEL_APPROVED' })).toHaveLength(1)
    expect(audit.list({ eventType: 'SENTINEL_VETOED' })).toHaveLength(1)
  })

  it('vetoes low consensus when provided', () => {
    const v = new SentinelEngine().evaluate(
      decision(),
      ctx({ consensusScore: 0.1 }),
    )
    expect(v.vetoReasons).toContain('MODEL_CONSENSUS_LOW')
  })
})
