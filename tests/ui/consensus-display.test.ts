import { describe, it, expect } from 'vitest'
import {
  inspectConsensus,
  consensusLabel,
  consensusTooltip,
} from '@/ui/consensus-display'
import type { TradeDecision } from '@/types/decision'

const decision = (over: Partial<TradeDecision> = {}): TradeDecision => ({
  id: 'd',
  timestamp: 1,
  instrumentId: 'BTCUSD',
  symbol: 'BTC/USD',
  action: 'BUY',
  size: 0.1,
  entryPrice: 60000,
  stopLoss: 58000,
  takeProfit: 65000,
  confidence: 0.7,
  riskLevel: 'medium',
  horizon: 'intraday',
  thesis: 't',
  keyFactors: [],
  invalidators: [],
  requiresHumanReview: false,
  modelSource: 'mock',
  consensusScore: null,
  _source: 'ai_orchestrator',
  _status: 'LIVE',
  _contextHash: 'h',
  ...over,
})

describe('inspectConsensus', () => {
  it('flags non-consensus decisions as such', () => {
    const info = inspectConsensus(decision())
    expect(info.isConsensus).toBe(false)
    expect(info.share).toBeNull()
    expect(info.isSplit).toBe(false)
    expect(info.votes).toEqual([])
    expect(consensusLabel(info)).toBeNull()
    expect(consensusTooltip(info)).toBeNull()
  })

  it('detects a unanimous consensus decision', () => {
    const info = inspectConsensus(
      decision({ _source: 'ai_consensus', consensusScore: 1, action: 'BUY' }),
    )
    expect(info.isConsensus).toBe(true)
    expect(info.share).toBe(1)
    expect(info.isSplit).toBe(false)
    expect(consensusLabel(info)).toBe('unanimous')
  })

  it('detects a sub-unanimous agreed consensus decision', () => {
    // 2 of 3 agreed on BUY → share 0.667, not a split (action !== HOLD).
    const info = inspectConsensus(
      decision({
        _source: 'ai_consensus',
        consensusScore: 2 / 3,
        action: 'BUY',
      }),
    )
    expect(info.isConsensus).toBe(true)
    expect(info.isSplit).toBe(false)
    expect(consensusLabel(info)).toBe('share 67%')
  })

  it('detects a split HOLD and parses per-provider votes with confidence', () => {
    const info = inspectConsensus(
      decision({
        _source: 'ai_consensus',
        consensusScore: 0.5,
        action: 'HOLD',
        size: 0,
        entryPrice: null,
        stopLoss: null,
        takeProfit: null,
        keyFactors: ['claude:BUY:0.85', 'rule-based:SELL:0.72'],
      }),
    )
    expect(info.isConsensus).toBe(true)
    expect(info.isSplit).toBe(true)
    expect(info.share).toBe(0.5)
    expect(info.votes).toEqual([
      { providerId: 'claude', action: 'BUY', confidence: 0.85 },
      { providerId: 'rule-based', action: 'SELL', confidence: 0.72 },
    ])
    expect(consensusLabel(info)).toBe('split 50%')
    const tip = consensusTooltip(info)
    expect(tip).toContain('claude → BUY (conf 0.85)')
    expect(tip).toContain('rule-based → SELL (conf 0.72)')
  })

  it('still parses legacy 2-segment keyFactors entries (no confidence)', () => {
    const info = inspectConsensus(
      decision({
        _source: 'ai_consensus',
        consensusScore: 0.5,
        action: 'HOLD',
        size: 0,
        keyFactors: ['claude:BUY', 'rule-based:SELL'],
      }),
    )
    expect(info.votes).toEqual([
      { providerId: 'claude', action: 'BUY', confidence: null },
      { providerId: 'rule-based', action: 'SELL', confidence: null },
    ])
    const tip = consensusTooltip(info)
    // Legacy entries get no "(conf ...)" suffix.
    expect(tip).toBe('provider votes:\nclaude → BUY\nrule-based → SELL')
  })

  it('handles provider ids that contain a colon (3-segment shape)', () => {
    // Real-world case: id = "claude:sonnet-4-5".
    const info = inspectConsensus(
      decision({
        _source: 'ai_consensus',
        consensusScore: 0.5,
        action: 'HOLD',
        size: 0,
        keyFactors: ['claude:sonnet-4-5:SELL:0.80', 'grok:grok-4:BUY:0.65'],
      }),
    )
    expect(info.votes).toEqual([
      { providerId: 'claude:sonnet-4-5', action: 'SELL', confidence: 0.8 },
      { providerId: 'grok:grok-4', action: 'BUY', confidence: 0.65 },
    ])
  })

  it('handles colon-containing ids under the legacy 2-segment shape', () => {
    const info = inspectConsensus(
      decision({
        _source: 'ai_consensus',
        consensusScore: 0.5,
        action: 'HOLD',
        size: 0,
        keyFactors: ['claude:sonnet-4-5:SELL', 'grok:grok-4:BUY'],
      }),
    )
    expect(info.votes).toEqual([
      { providerId: 'claude:sonnet-4-5', action: 'SELL', confidence: null },
      { providerId: 'grok:grok-4', action: 'BUY', confidence: null },
    ])
  })

  it('skips garbage keyFactors entries', () => {
    const info = inspectConsensus(
      decision({
        _source: 'ai_consensus',
        consensusScore: 0.5,
        action: 'HOLD',
        size: 0,
        keyFactors: [':BUY', 'no-colon', 'p1:', 'p2:WAIT', 'p3:BUY:0.9'],
      }),
    )
    // Only p3:BUY:0.9 survives. WAIT is not a valid action.
    expect(info.votes).toEqual([
      { providerId: 'p3', action: 'BUY', confidence: 0.9 },
    ])
  })

  it('falls back to a share-only tooltip when votes cannot be parsed', () => {
    const info = inspectConsensus(
      decision({
        _source: 'ai_consensus',
        consensusScore: 0.8,
        action: 'BUY',
        keyFactors: ['ema', 'rsi'],
      }),
    )
    expect(consensusTooltip(info)).toBe('consensus share 80%')
  })
})
