import { describe, it, expect } from 'vitest'
import { isReviewable } from '@/store/chain'
import type { TradeDecision, SentinelVeto } from '@/types/decision'

const dec = (over: Partial<TradeDecision> = {}): TradeDecision => ({
  id: 'd1',
  timestamp: 1,
  instrumentId: 'BTCUSD',
  symbol: 'BTC/USD',
  action: 'BUY',
  size: 0.1,
  entryPrice: 60_000,
  stopLoss: 58_000,
  takeProfit: 65_000,
  confidence: 0.55,
  riskLevel: 'medium',
  horizon: 'intraday',
  thesis: 't',
  keyFactors: [],
  invalidators: [],
  requiresHumanReview: true,
  modelSource: 'rule-based',
  consensusScore: null,
  _source: 'ai_orchestrator',
  _status: 'LIVE',
  _contextHash: 'h',
  ...over,
})

const veto = (reasons: SentinelVeto['vetoReasons']): SentinelVeto => ({
  id: 'v1',
  timestamp: 1,
  decisionId: 'd1',
  approved: reasons.length === 0,
  vetoReasons: reasons,
  riskMetrics: {
    currentDrawdown: 0,
    maxDrawdownLimit: 5,
    currentExposure: 0,
    maxExposureLimit: 60,
    dataQualityScore: 1,
    minDataQuality: 0.7,
    latencyMs: 0,
    maxLatencyMs: 500,
    brokerAvailable: true,
  },
  safeMode: false,
  _source: 'sentinel_engine',
})

describe('isReviewable', () => {
  it('returns true when requiresHumanReview AND only MANUAL_BLOCK fired', () => {
    expect(isReviewable(dec(), veto(['MANUAL_BLOCK']))).toBe(true)
  })

  it('returns false when requiresHumanReview is false', () => {
    expect(
      isReviewable(dec({ requiresHumanReview: false }), veto(['MANUAL_BLOCK'])),
    ).toBe(false)
  })

  it('returns false when no veto reasons fired (approved)', () => {
    expect(isReviewable(dec(), veto([]))).toBe(false)
  })

  it('returns false when MANUAL_BLOCK fired alongside a hard risk rule', () => {
    // Operator cannot override drawdown — drop straight to vetoed.
    expect(
      isReviewable(dec(), veto(['MANUAL_BLOCK', 'DRAWDOWN_EXCEEDED'])),
    ).toBe(false)
  })

  it('returns false when only a hard rule fired (no MANUAL_BLOCK)', () => {
    expect(isReviewable(dec(), veto(['DATA_QUALITY_LOW']))).toBe(false)
  })
})
