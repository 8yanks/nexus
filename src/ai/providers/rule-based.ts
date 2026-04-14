import type { AIProvider } from '@/ai/orchestrator'
import type { AnalystContext } from '@/analyst/context-builder'
import type { DecisionAction } from '@/types/decision'

export interface RuleBasedOptions {
  /** Minimum net signal strength required to issue a non-HOLD decision. */
  minStrength?: number
  /** Default position size as a fraction of equity (e.g. 0.02 = 2%). */
  defaultSize?: number
  /** Stop-loss / take-profit multipliers relative to entry price. */
  stopPct?: number
  takePct?: number
  now?: () => number
  idGen?: () => string
}

/**
 * Deterministic AI provider that aggregates bullish vs bearish signal
 * strength from the Analyst context and emits a schema-conformant
 * TradeDecision. Useful for offline demos and integration tests: no
 * network call, no free-form reasoning, same input → same output.
 */
export function ruleBasedProvider(
  getContext: () => AnalystContext,
  opts: RuleBasedOptions = {},
): AIProvider {
  const minStrength = opts.minStrength ?? 0.4
  const size = opts.defaultSize ?? 0.02
  const stop = opts.stopPct ?? 0.02
  const take = opts.takePct ?? 0.05
  const now = opts.now ?? Date.now
  let seq = 0
  const idGen =
    opts.idGen ??
    (() => `dec_${Date.now().toString(36)}_${(seq++).toString(36)}`)

  return {
    id: 'rule_based',
    propose: async () => {
      const ctx = getContext()
      let bull = 0
      let bear = 0
      const factors: string[] = []
      for (const s of ctx.signals) {
        if (s.direction === 'bullish') bull += s.strength
        else if (s.direction === 'bearish') bear += s.strength
        factors.push(`${s.type}:${s.strength.toFixed(2)}`)
      }
      const net = bull - bear
      let action: DecisionAction = 'HOLD'
      if (net >= minStrength) action = 'BUY'
      else if (net <= -minStrength) action = 'SELL'

      const confidence = Math.min(1, Math.abs(net) / 2)
      const entry = ctx.price
      const isBuy = action === 'BUY'

      return {
        id: idGen(),
        timestamp: now(),
        instrumentId: ctx.instrumentId,
        symbol: ctx.symbol,
        action,
        size: action === 'HOLD' ? 0 : size,
        entryPrice: action === 'HOLD' ? null : entry,
        stopLoss:
          action === 'HOLD'
            ? null
            : isBuy
              ? entry * (1 - stop)
              : entry * (1 + stop),
        takeProfit:
          action === 'HOLD'
            ? null
            : isBuy
              ? entry * (1 + take)
              : entry * (1 - take),
        confidence,
        riskLevel: confidence > 0.75 ? 'low' : confidence > 0.4 ? 'medium' : 'high',
        horizon: 'intraday',
        thesis:
          action === 'HOLD'
            ? 'Insufficient net signal strength'
            : `Net ${net.toFixed(2)} favors ${action}`,
        keyFactors: factors,
        invalidators: ['opposing signal cluster', 'data quality drop'],
        requiresHumanReview: confidence < 0.5,
        modelSource: 'rule_based_v1',
        consensusScore: null,
        _source: 'ai_orchestrator',
        _status: ctx.quality?._status ?? 'SIMULATED',
        _contextHash: ctx.contextHash,
      }
    },
  }
}
