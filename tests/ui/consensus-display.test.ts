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

  it('detects a split HOLD and parses per-provider votes', () => {
    const info = inspectConsensus(
      decision({
        _source: 'ai_consensus',
        consensusScore: 0.5,
        action: 'HOLD',
        size: 0,
        entryPrice: null,
        stopLoss: null,
        takeProfit: null,
        keyFactors: ['claude:BUY', 'rule-based:SELL'],
      }),
    )
    expect(info.isConsensus).toBe(true)
    expect(info.isSplit).toBe(true)
    expect(info.share).toBe(0.5)
    expect(info.votes).toEqual([
      { providerId: 'claude', action: 'BUY' },
      { providerId: 'rule-based', action: 'SELL' },
    ])
    expect(consensusLabel(info)).toBe('split 50%')
    const tip = consensusTooltip(info)
    expect(tip).toContain('claude → BUY')
    expect(tip).toContain('rule-based → SELL')
  })

  it('handles provider ids that contain a colon', () => {
    // Real-world case: id = "consensus[a+b]" or "claude-3:opus".
    const info = inspectConsensus(
      decision({
        _source: 'ai_consensus',
        consensusScore: 0.5,
        action: 'HOLD',
        size: 0,
        keyFactors: ['claude-3:opus:SELL', 'rule-based:BUY'],
      }),
    )
    expect(info.votes).toEqual([
      { providerId: 'claude-3:opus', action: 'SELL' },
      { providerId: 'rule-based', action: 'BUY' },
    ])
  })

  it('skips garbage keyFactors entries', () => {
    const info = inspectConsensus(
      decision({
        _source: 'ai_consensus',
        consensusScore: 0.5,
        action: 'HOLD',
        size: 0,
        keyFactors: [':BUY', 'no-colon', 'p1:', 'p2:WAIT', 'p3:BUY'],
      }),
    )
    // Only p3:BUY survives. WAIT is not a valid action.
    expect(info.votes).toEqual([{ providerId: 'p3', action: 'BUY' }])
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
