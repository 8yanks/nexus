import type { TradeDecision, SentinelVeto } from '@/types/decision'
import type { PaperOrder } from '@/types/order'
import type { AuditLogger } from '@/audit/logger'

export interface TraderEngineOptions {
  audit?: AuditLogger
  /** Simulated slippage as a fraction of price (e.g. 0.0005 = 5 bps). */
  slippageBps?: number
  now?: () => number
  idGen?: () => string
  /** Market price resolver, used when the decision has no explicit entryPrice. */
  markPrice?: (instrumentId: string) => number | null
}

export type TraderResult =
  | { ok: true; order: PaperOrder }
  | { ok: false; reason: string }

/**
 * Receives a TradeDecision plus its Sentinel approval and produces a
 * PaperOrder. Refuses to act on non-approved vetos or mismatched IDs.
 * Paper-only: never touches a real broker.
 */
export class TraderEngine {
  private readonly audit?: AuditLogger
  private readonly slippage: number
  private readonly now: () => number
  private readonly idGen: () => string
  private readonly markPrice?: (id: string) => number | null
  private seq = 0

  constructor(opts: TraderEngineOptions = {}) {
    this.audit = opts.audit
    this.slippage = opts.slippageBps ?? 0.0005
    this.now = opts.now ?? (() => Date.now())
    this.idGen =
      opts.idGen ??
      (() => `ord_${Date.now().toString(36)}_${(this.seq++).toString(36)}`)
    this.markPrice = opts.markPrice
  }

  execute(decision: TradeDecision, veto: SentinelVeto): TraderResult {
    // Pre-trade integrity
    if (veto.decisionId !== decision.id) {
      const reason = 'veto.decisionId does not match decision.id'
      this.audit?.log('trader', 'ORDER_REJECTED', reason, {
        decisionId: decision.id,
      })
      return { ok: false, reason }
    }
    if (!veto.approved) {
      const reason = `sentinel vetoed: ${veto.vetoReasons.join(', ')}`
      this.audit?.log('trader', 'ORDER_REJECTED', reason, {
        decisionId: decision.id,
      })
      return { ok: false, reason }
    }
    if (decision.action === 'HOLD') {
      this.audit?.log('trader', 'PRE_TRADE_CHECK', 'HOLD, no order', {
        decisionId: decision.id,
      })
      return { ok: false, reason: 'HOLD action, no order emitted' }
    }

    const price =
      decision.entryPrice ?? this.markPrice?.(decision.instrumentId) ?? null
    if (price === null || !Number.isFinite(price) || price <= 0) {
      const reason = 'no valid price available'
      this.audit?.log('trader', 'ORDER_REJECTED', reason, {
        decisionId: decision.id,
      })
      return { ok: false, reason }
    }

    const side = decision.action === 'BUY' ? 'buy' : 'sell'
    const slipAmount = price * this.slippage * (side === 'buy' ? 1 : -1)
    const fillPrice = price + slipAmount
    const t = this.now()

    const order: PaperOrder = {
      id: this.idGen(),
      timestamp: t,
      decisionId: decision.id,
      sentinelApprovalId: veto.id,
      instrumentId: decision.instrumentId,
      symbol: decision.symbol,
      side,
      type: decision.entryPrice === null ? 'market' : 'limit',
      size: decision.size,
      price,
      slippage: this.slippage,
      status: 'filled',
      fillPrice,
      fillTime: t,
      pnl: 0,
      _source: 'paper_broker',
      _status: 'SIMULATED',
    }

    this.audit?.log(
      'trader',
      'ORDER_SUBMITTED',
      `${side} ${decision.symbol} size=${decision.size}`,
      { orderId: order.id, decisionId: decision.id },
    )
    this.audit?.log(
      'trader',
      'ORDER_FILLED',
      `${side} ${decision.symbol} @ ${fillPrice.toFixed(4)}`,
      { orderId: order.id, fillPrice },
    )
    return { ok: true, order }
  }
}
