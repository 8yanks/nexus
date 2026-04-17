import { create } from 'zustand'
import type { AuditEntry } from '@/types/audit'
import type { SentinelVeto, TradeDecision } from '@/types/decision'
import type { PaperOrder } from '@/types/order'
import { auditLogger } from '@/audit/logger'
import { AIOrchestrator } from '@/ai/orchestrator'
import { ConsensusOrchestrator } from '@/ai/consensus'
import { SentinelEngine } from '@/sentinel/engine'
import { TraderEngine } from '@/trader/engine'
import { PositionManager } from '@/trader/position-manager'
import type { Position } from '@/types/position'
import { DecisionChain } from '@/chain'
import {
  buildAnalystContext,
  toSentinelContext,
  type AnalystContext,
} from '@/analyst/context-builder'
import { ruleBasedProvider } from '@/ai/providers/rule-based'
import { claudeProvider } from '@/ai/providers/claude'
import type { SentinelContext } from '@/sentinel/engine'
import { config } from '@/infra/env'
import { useMarketStore } from '@/store/market'
import {
  saveDecision,
  saveVeto,
  saveOrder,
  savePosition,
  saveAuditEntries,
  loadDecisions,
  loadOrders,
  loadVetos,
  loadPositions,
  loadAuditEntries,
  clearChainStores,
} from '@/storage/chain'

const startOfDay = (t: number): number => {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** A Sentinel-vetoed decision that the AI self-flagged for human review. */
export interface ReviewRequest {
  id: string
  queuedAt: number
  decision: TradeDecision
  veto: SentinelVeto
  /** Non-MANUAL_BLOCK reasons, if any — operator can see what else blocked. */
  otherReasons: string[]
}

/**
 * A vetoed decision is reviewable only when:
 *  1. The AI itself flagged it for human review, and
 *  2. The ONLY reason Sentinel blocked it is MANUAL_BLOCK.
 *
 * If a hard risk rule (drawdown, exposure, data quality, ...) also fired,
 * the operator cannot override it — those vetos are terminal.
 */
export const isReviewable = (
  decision: Pick<TradeDecision, 'requiresHumanReview'>,
  veto: Pick<SentinelVeto, 'vetoReasons'>,
): boolean => {
  if (!decision.requiresHumanReview) return false
  const reasons = veto.vetoReasons
  if (reasons.length === 0) return false
  return reasons.every((r) => r === 'MANUAL_BLOCK')
}

interface ChainState {
  entries: AuditEntry[]
  vetos: SentinelVeto[]
  orders: PaperOrder[]
  decisions: TradeDecision[]
  positions: Position[]
  portfolio: {
    openCount: number
    grossExposure: number
    unrealizedPnl: number
    realizedPnl: number
  }
  lastOutcome: string | null
  autoRun: boolean
  autoRunIntervalMs: number
  /** Synthetic equity baseline used to convert PnL/exposure → percent. */
  equityBaseline: number
  /** Manual kill-switch surfaced via UI; forwarded into SentinelContext. */
  safeMode: boolean
  /** Last instrument actually fed into the chain — null if synthetic fallback. */
  lastContextInstrumentId: string | null
  /** Decisions waiting on a human yes/no before they can execute. */
  reviewQueue: ReviewRequest[]
  runDemo: () => Promise<void>
  mark: () => void
  closePosition: (id: string) => void
  setAutoRun: (enabled: boolean, intervalMs?: number) => void
  setSafeMode: (enabled: boolean) => void
  acceptReview: (id: string) => void
  dismissReview: (id: string) => void
  clear: () => void
}

/**
 * Pulls the freshest AnalystContext from the market store. Falls back to a
 * synthetic context when no snapshot is available yet so the UI button
 * always produces a traceable outcome instead of silently failing. The
 * fallback path is logged to audit so the operator can see *why* a chain
 * run targeted the synthetic instrument instead of a real one.
 */
let lastCtx: AnalystContext | null = null
let lastFallbackLogged = false

function pickContext(): {
  ctx: AnalystContext
  isFallback: boolean
} {
  const m = useMarketStore.getState()
  const focus = m.selectedInstrumentId ?? m.instruments[0]?.id
  const snap = focus ? m.snapshots[focus] : undefined
  const inst = m.instruments.find((i) => i.id === focus)
  if (snap && inst) {
    lastCtx = buildAnalystContext({
      snapshot: snap,
      signals: m.signals.filter((s) => s.instrumentId === focus).slice(0, 20),
      quality: focus ? (m.quality[focus] ?? null) : null,
      symbol: inst.symbol,
    })
    lastFallbackLogged = false
    return { ctx: lastCtx, isFallback: false }
  }
  if (!lastCtx) {
    const nowIso = new Date().toISOString()
    lastCtx = {
      instrumentId: 'BTCUSD',
      symbol: 'BTC/USD',
      price: 60000,
      snapshot: {
        instrumentId: 'BTCUSD',
        price: 60000,
        bid: null,
        ask: null,
        spread: null,
        spreadBps: null,
        change24h: null,
        change24hPct: null,
        high24h: null,
        low24h: null,
        volume24h: null,
        openInterest: null,
        fundingRate: null,
        nextFunding: null,
        liquidations24h: null,
        vwap: null,
        _source: 'synthetic',
        _status: 'SIMULATED',
        _provenance: {
          source: 'synthetic',
          fetchMethod: 'mock',
          latencyMs: 0,
          timestamp: nowIso,
          receivedAt: nowIso,
        },
        _quality: {
          completeness: 0,
          timeliness: 0,
          accuracy: 0,
          consistency: 0,
        },
      },
      signals: [],
      quality: null,
      contextHash: 'synthetic',
      builtAt: Date.now(),
    }
  }
  return { ctx: lastCtx, isFallback: true }
}

// Provider needs an AnalystContext factory — wraps pickContext.
const pickContextForProvider = (): AnalystContext => pickContext().ctx

// When a real LLM is configured we still vote with the deterministic
// rule-based provider in parallel. The consensus layer surfaces disagreements
// (HOLD with low confidence + requiresHumanReview) instead of silently
// accepting whatever Claude returned. With no key, we collapse to the single
// rule-based provider via AIOrchestrator — same OrchestratorResult shape.
const ai = config.anthropicApiKey
  ? new ConsensusOrchestrator({
      providers: [
        claudeProvider(pickContextForProvider, {
          apiKey: config.anthropicApiKey,
          model: config.anthropicModel,
        }),
        ruleBasedProvider(pickContextForProvider),
      ],
      id: 'consensus[claude+rule-based]',
      audit: auditLogger,
    })
  : new AIOrchestrator(ruleBasedProvider(pickContextForProvider), {
      audit: auditLogger,
    })
const sentinel = new SentinelEngine({ audit: auditLogger })
const trader = new TraderEngine({ audit: auditLogger })
const positionManager = new PositionManager({ audit: auditLogger })
const chain = new DecisionChain({ ai, sentinel, trader, audit: auditLogger })

const syncPositionState = (
  set: (fn: (s: ChainState) => Partial<ChainState>) => void,
) =>
  set(() => ({
    positions: positionManager.list(),
    portfolio: positionManager.portfolio(),
  }))

let autoRunTimer: ReturnType<typeof setInterval> | null = null
// Single-flight guard — protects against a slow AI/network call overlapping
// with the next tick of setInterval, which would otherwise queue calls
// faster than they complete.
let runInFlight = false

// Debounced audit flush so we don't hit IDB on every log line.
let flushTimer: ReturnType<typeof setTimeout> | null = null
let pendingAudit: AuditEntry[] = []
const queueAuditFlush = () => {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    const batch = pendingAudit
    pendingAudit = []
    if (batch.length) void saveAuditEntries(batch).catch(() => {})
  }, 500)
}

export const useChainStore = create<ChainState>((set) => {
  auditLogger.subscribe((e) => {
    pendingAudit.push(e)
    queueAuditFlush()
    set({ entries: auditLogger.list().slice(-500).reverse() })
  })

  // Auto mark-to-market whenever the market store refreshes.
  useMarketStore.subscribe((state, prev) => {
    if (state.lastRefresh === prev.lastRefresh) return
    const prices: Record<string, number> = {}
    for (const [id, snap] of Object.entries(state.snapshots)) {
      if (snap?.price) prices[id] = snap.price
    }
    const closed = positionManager.mark(prices)
    for (const p of closed) void savePosition(p).catch(() => {})
    if (closed.length > 0 || positionManager.listOpen().length > 0) {
      set({
        positions: positionManager.list(),
        portfolio: positionManager.portfolio(),
      })
    }
  })

  // Hydrate from IndexedDB on first use (browser only).
  if (typeof indexedDB !== 'undefined') {
    void (async () => {
      try {
        const [decisions, orders, vetos, audit, storedPositions] =
          await Promise.all([
            loadDecisions(),
            loadOrders(),
            loadVetos(),
            loadAuditEntries(),
            loadPositions(),
          ])
        // Rehydrate audit logger so entries outlive reloads
        for (const e of audit.sort((a, b) => a.timestamp - b.timestamp)) {
          auditLogger.log(e.module, e.eventType, e.summary, e.data, e._source)
        }
        positionManager.hydrate(storedPositions)
        set({
          decisions: decisions
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 50),
          orders: orders
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 50),
          vetos: vetos
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 50),
          positions: positionManager.list(),
          portfolio: positionManager.portfolio(),
        })
      } catch {
        // IDB unavailable — stay in-memory only
      }
    })()
  }

  return {
    entries: auditLogger.list().reverse(),
    vetos: [],
    orders: [],
    decisions: [],
    positions: [],
    portfolio: {
      openCount: 0,
      grossExposure: 0,
      unrealizedPnl: 0,
      realizedPnl: 0,
    },
    lastOutcome: null,
    autoRun: false,
    autoRunIntervalMs: 15_000,
    equityBaseline: 10_000,
    safeMode: false,
    lastContextInstrumentId: null,
    reviewQueue: [],
    acceptReview: (id: string) => {
      const s = useChainStore.getState()
      const req = s.reviewQueue.find((r) => r.id === id)
      if (!req) return

      // Build a synthetic "approved" veto carrying the manual override so
      // the Trader engine accepts the order. The original veto + decision
      // are still preserved in audit + state.
      const overrideVeto: SentinelVeto = {
        ...req.veto,
        id: `${req.veto.id}_override_${Date.now().toString(36)}`,
        timestamp: Date.now(),
        approved: true,
        vetoReasons: [],
      }
      auditLogger.log(
        'system',
        'REVIEW_COMPLETED',
        `manual override accepted: ${req.decision.action} ${req.decision.symbol}`,
        {
          reviewId: req.id,
          decisionId: req.decision.id,
          originalVetoId: req.veto.id,
          overrideVetoId: overrideVeto.id,
        },
      )

      const result = trader.execute(req.decision, overrideVeto)
      const next: Partial<ChainState> = {
        reviewQueue: s.reviewQueue.filter((r) => r.id !== id),
        vetos: [overrideVeto, ...s.vetos].slice(0, 50),
      }
      void saveVeto(overrideVeto).catch(() => {})

      if (result.ok) {
        next.orders = [result.order, ...s.orders].slice(0, 50)
        void saveOrder(result.order).catch(() => {})
        const pos = positionManager.open(result.order, req.decision)
        if (pos) void savePosition(pos).catch(() => {})
        next.positions = positionManager.list()
        next.portfolio = positionManager.portfolio()
        next.lastOutcome = 'filled'
      } else {
        next.lastOutcome = 'order_rejected'
      }
      set(next)
    },
    dismissReview: (id: string) => {
      const s = useChainStore.getState()
      const req = s.reviewQueue.find((r) => r.id === id)
      if (!req) return
      auditLogger.log(
        'system',
        'REVIEW_COMPLETED',
        `manual override dismissed: ${req.decision.action} ${req.decision.symbol}`,
        { reviewId: req.id, decisionId: req.decision.id, dismissed: true },
      )
      set({ reviewQueue: s.reviewQueue.filter((r) => r.id !== id) })
    },
    setSafeMode: (enabled: boolean) => {
      set({ safeMode: enabled })
      auditLogger.log(
        'system',
        enabled ? 'SAFE_MODE_ACTIVATED' : 'SAFE_MODE_DEACTIVATED',
        enabled
          ? 'safe mode enabled — all non-HOLD trades will be vetoed'
          : 'safe mode disabled',
      )
    },
    setAutoRun: (enabled: boolean, intervalMs?: number) => {
      if (autoRunTimer) {
        clearInterval(autoRunTimer)
        autoRunTimer = null
      }
      const ms = intervalMs ?? useChainStore.getState().autoRunIntervalMs
      if (enabled) {
        autoRunTimer = setInterval(() => {
          if (runInFlight) return // Drop this tick — the previous run is still pending.
          void useChainStore.getState().runDemo()
        }, ms)
      }
      set({ autoRun: enabled, autoRunIntervalMs: ms })
    },
    mark: () => {
      const m = useMarketStore.getState()
      const prices: Record<string, number> = {}
      for (const [id, snap] of Object.entries(m.snapshots)) {
        if (snap?.price) prices[id] = snap.price
      }
      const closed = positionManager.mark(prices)
      for (const p of closed) void savePosition(p).catch(() => {})
      syncPositionState(set)
    },
    closePosition: (id: string) => {
      const m = useMarketStore.getState()
      const pos = positionManager.list().find((p) => p.id === id)
      if (!pos) return
      const px = m.snapshots[pos.instrumentId]?.price ?? pos.markPrice
      const closed = positionManager.close(id, px, 'manual')
      if (closed) void savePosition(closed).catch(() => {})
      syncPositionState(set)
    },
    runDemo: async () => {
      if (runInFlight) return
      runInFlight = true
      try {
      const picked = pickContext()
      const ctx = picked.ctx
      const s0 = useChainStore.getState()

      if (picked.isFallback && !lastFallbackLogged) {
        auditLogger.log(
          'system',
          'CONTEXT_BUILT',
          'fallback to synthetic context — no live snapshot available',
          { contextHash: ctx.contextHash, instrumentId: ctx.instrumentId },
        )
        lastFallbackLogged = true
      }
      set({
        lastContextInstrumentId: picked.isFallback ? null : ctx.instrumentId,
      })

      // Derive daily caps from the in-memory state so Sentinel's
      // maxDailyLoss / maxDailyTrades rules actually fire.
      const dayStart = startOfDay(Date.now())
      const dailyTradesCount = s0.orders.filter(
        (o) => o.timestamp >= dayStart,
      ).length
      const dailyLoss = positionManager
        .list()
        .filter(
          (p) =>
            p.status === 'closed' &&
            p.closedAt !== null &&
            p.closedAt >= dayStart,
        )
        .reduce((sum, p) => sum + (p.realizedPnl ?? 0), 0)
      const equity = Math.max(1, s0.equityBaseline)
      const safeMode = s0.safeMode
      const portfolio = positionManager.portfolio()

      // Build the Sentinel context lazily so positionSizePct reflects the
      // *actual* decision size (notional / equity), not a magic number.
      const buildSentinelCtx = (decision: TradeDecision): SentinelContext => {
        const newNotional =
          decision.action === 'HOLD'
            ? 0
            : Math.abs(decision.size) * (decision.entryPrice ?? ctx.price)
        const projectedExposurePct = Math.min(
          100,
          ((portfolio.grossExposure + newNotional) / equity) * 100,
        )
        const positionSizePct = Math.min(100, (newNotional / equity) * 100)
        const sctx = toSentinelContext(ctx, {
          currentDrawdownPct: Math.max(
            0,
            (-portfolio.unrealizedPnl / equity) * 100,
          ),
          currentExposurePct: projectedExposurePct,
          positionSizePct,
          brokerAvailable: true,
          safeMode,
        })
        sctx.dailyLoss = dailyLoss
        sctx.dailyTradesCount = dailyTradesCount
        return sctx
      }

      const outcome = await chain.run(ctx.contextHash, { ctx }, buildSentinelCtx)
      set((s) => {
        const next: Partial<ChainState> = { lastOutcome: outcome.stage }
        if (outcome.stage !== 'ai_rejected') {
          next.decisions = [outcome.decision, ...s.decisions].slice(0, 50)
          next.vetos = [outcome.veto, ...s.vetos].slice(0, 50)
          void saveDecision(outcome.decision).catch(() => {})
          void saveVeto(outcome.veto).catch(() => {})
        }
        if (outcome.stage === 'filled') {
          next.orders = [outcome.order, ...s.orders].slice(0, 50)
          void saveOrder(outcome.order).catch(() => {})
          const pos = positionManager.open(outcome.order, outcome.decision)
          if (pos) void savePosition(pos).catch(() => {})
          next.positions = positionManager.list()
          next.portfolio = positionManager.portfolio()
        }
        // Queue review when the AI self-flagged AND the only blocker is
        // MANUAL_BLOCK. If other risk reasons fired, the operator cannot
        // override them — drop straight to vetoed and skip the queue.
        if (outcome.stage === 'sentinel_vetoed') {
          if (isReviewable(outcome.decision, outcome.veto)) {
            const req: ReviewRequest = {
              id: `rev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
              queuedAt: Date.now(),
              decision: outcome.decision,
              veto: outcome.veto,
              otherReasons: [],
            }
            next.reviewQueue = [req, ...s.reviewQueue].slice(0, 20)
            auditLogger.log(
              'system',
              'REVIEW_TRIGGERED',
              `manual review queued for ${outcome.decision.action} ${outcome.decision.symbol}`,
              { reviewId: req.id, decisionId: outcome.decision.id },
            )
          }
        }
        return next
      })
      } finally {
        runInFlight = false
      }
    },
    clear: () => {
      auditLogger.clear()
      positionManager.reset()
      void clearChainStores().catch(() => {})
      set({
        entries: [],
        vetos: [],
        orders: [],
        decisions: [],
        positions: [],
        portfolio: {
          openCount: 0,
          grossExposure: 0,
          unrealizedPnl: 0,
          realizedPnl: 0,
        },
        lastOutcome: null,
        lastContextInstrumentId: null,
        reviewQueue: [],
      })
      lastFallbackLogged = false
    },
  }
})

