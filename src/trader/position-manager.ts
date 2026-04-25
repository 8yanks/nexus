import type { PaperOrder } from '@/types/order'
import type { TradeDecision } from '@/types/decision'
import type {
  Position,
  PositionCloseReason,
  PositionSide,
} from '@/types/position'
import type { AuditLogger } from '@/audit/logger'

export interface PositionManagerOptions {
  audit?: AuditLogger
  now?: () => number
  idGen?: () => string
}

export interface PortfolioSnapshot {
  openCount: number
  grossExposure: number
  unrealizedPnl: number
  realizedPnl: number
}

/**
 * Tracks open paper positions, marks them to market on every price tick,
 * and closes them when stop-loss or take-profit hits. Realized PnL
 * accumulates across the session; unrealized PnL is recomputed live.
 */
export class PositionManager {
  private positions = new Map<string, Position>()
  private realized = 0
  private readonly audit?: AuditLogger
  private readonly now: () => number
  private readonly idGen: () => string
  private seq = 0
  private listeners = new Set<(p: Position) => void>()

  constructor(opts: PositionManagerOptions = {}) {
    this.audit = opts.audit
    this.now = opts.now ?? (() => Date.now())
    this.idGen =
      opts.idGen ??
      (() => `pos_${Date.now().toString(36)}_${(this.seq++).toString(36)}`)
  }

  /**
   * Open a position from a filled paper order. Uses the decision's SL/TP
   * so risk parameters travel with the position.
   */
  open(order: PaperOrder, decision: TradeDecision): Position | null {
    if (order.status !== 'filled' || order.fillPrice === null) return null
    const side: PositionSide = order.side === 'buy' ? 'long' : 'short'
    const pos: Position = {
      id: this.idGen(),
      orderId: order.id,
      decisionId: decision.id,
      instrumentId: order.instrumentId,
      symbol: order.symbol,
      side,
      size: order.size,
      entryPrice: order.fillPrice,
      stopLoss: decision.stopLoss,
      takeProfit: decision.takeProfit,
      openedAt: this.now(),
      closedAt: null,
      markPrice: order.fillPrice,
      unrealizedPnl: 0,
      unrealizedPnlPct: 0,
      realizedPnl: null,
      closeReason: null,
      status: 'open',
      _source: 'paper_broker',
      _status: order._status,
    }
    this.positions.set(pos.id, pos)
    this.audit?.log(
      'trader',
      'POSITION_OPENED',
      `${side} ${pos.symbol} ${pos.size} @ ${pos.entryPrice.toFixed(4)}`,
      { positionId: pos.id, orderId: order.id, decisionId: decision.id },
    )
    for (const l of this.listeners) l(pos)
    return pos
  }

  /**
   * Update mark prices and auto-close any position whose SL/TP is crossed.
   * Returns the positions that were just closed so callers can persist them.
   */
  mark(prices: Record<string, number>): Position[] {
    const closed: Position[] = []
    for (const pos of this.positions.values()) {
      if (pos.status !== 'open') continue
      const px = prices[pos.instrumentId]
      if (px === undefined || !Number.isFinite(px)) continue
      pos.markPrice = px
      const dir = pos.side === 'long' ? 1 : -1
      pos.unrealizedPnl = (px - pos.entryPrice) * pos.size * dir
      pos.unrealizedPnlPct =
        ((px - pos.entryPrice) / pos.entryPrice) * 100 * dir

      const hitStop =
        pos.stopLoss !== null &&
        (pos.side === 'long' ? px <= pos.stopLoss : px >= pos.stopLoss)
      const hitTake =
        pos.takeProfit !== null &&
        (pos.side === 'long' ? px >= pos.takeProfit : px <= pos.takeProfit)

      if (hitStop) {
        this.closePosition(pos, px, 'stop_loss')
        closed.push(pos)
      } else if (hitTake) {
        this.closePosition(pos, px, 'take_profit')
        closed.push(pos)
      }
    }
    return closed
  }

  /** Manually close a position at the given price. */
  close(
    positionId: string,
    price: number,
    reason: PositionCloseReason = 'manual',
  ): Position | null {
    const pos = this.positions.get(positionId)
    if (!pos || pos.status !== 'open') return null
    this.closePosition(pos, price, reason)
    return pos
  }

  private closePosition(
    pos: Position,
    price: number,
    reason: PositionCloseReason,
  ): void {
    const dir = pos.side === 'long' ? 1 : -1
    const pnl = (price - pos.entryPrice) * pos.size * dir
    pos.markPrice = price
    pos.unrealizedPnl = 0
    pos.unrealizedPnlPct = 0
    pos.realizedPnl = pnl
    pos.closeReason = reason
    pos.closedAt = this.now()
    pos.status = 'closed'
    this.realized += pnl
    this.audit?.log(
      'trader',
      'POSITION_CLOSED',
      `${pos.symbol} closed (${reason}) pnl=${pnl.toFixed(4)}`,
      { positionId: pos.id, reason, pnl, closePrice: price },
    )
    this.audit?.log(
      'trader',
      'PNL_UPDATED',
      `realized=${this.realized.toFixed(4)}`,
      { realized: this.realized, delta: pnl },
    )
    for (const l of this.listeners) l(pos)
  }

  list(): Position[] {
    return [...this.positions.values()]
  }

  listOpen(): Position[] {
    return this.list().filter((p) => p.status === 'open')
  }

  /** Hydrate positions from persisted snapshots. Skips duplicates by id. */
  hydrate(positions: Position[]): void {
    for (const p of positions) if (!this.positions.has(p.id)) this.positions.set(p.id, p)
    this.realized = positions
      .filter((p) => p.status === 'closed' && p.realizedPnl !== null)
      .reduce((s, p) => s + (p.realizedPnl ?? 0), 0)
  }

  portfolio(): PortfolioSnapshot {
    let gross = 0
    let unreal = 0
    let open = 0
    for (const p of this.positions.values()) {
      if (p.status === 'open') {
        open++
        gross += Math.abs(p.markPrice * p.size)
        unreal += p.unrealizedPnl
      }
    }
    return {
      openCount: open,
      grossExposure: gross,
      unrealizedPnl: unreal,
      realizedPnl: this.realized,
    }
  }

  subscribe(fn: (p: Position) => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  reset(): void {
    this.positions.clear()
    this.realized = 0
  }
}
