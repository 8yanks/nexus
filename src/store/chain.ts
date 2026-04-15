import { create } from 'zustand'
import type { AuditEntry } from '@/types/audit'
import type { SentinelVeto, TradeDecision } from '@/types/decision'
import type { PaperOrder } from '@/types/order'
import { auditLogger } from '@/audit/logger'
import { AIOrchestrator } from '@/ai/orchestrator'
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
  runDemo: () => Promise<void>
  mark: () => void
  closePosition: (id: string) => void
  setAutoRun: (enabled: boolean, intervalMs?: number) => void
  clear: () => void
}

/**
 * Pulls the freshest AnalystContext from the market store. Falls back to a
 * synthetic context when no snapshot is available yet so the UI button
 * always produces a traceable outcome instead of silently failing.
 */
let lastCtx: AnalystContext | null = null

function pickContext(): AnalystContext {
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
  } else if (!lastCtx) {
    lastCtx = {
      instrumentId: 'BTCUSD',
      symbol: 'BTC/USD',
      price: 60000,
      snapshot: {
        instrumentId: 'BTCUSD',
        price: 60000,
        timestamp: new Date().toISOString(),
        _source: 'synthetic',
        _status: 'SIMULATED',
      } as never,
      signals: [],
      quality: null,
      contextHash: 'synthetic',
      builtAt: Date.now(),
    }
  }
  return lastCtx
}

const provider = config.anthropicApiKey
  ? claudeProvider(pickContext, {
      apiKey: config.anthropicApiKey,
      model: config.anthropicModel,
    })
  : ruleBasedProvider(pickContext)
const ai = new AIOrchestrator(provider, { audit: auditLogger })
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
      const ctx = pickContext()
      // Derive daily caps from the in-memory state so Sentinel's
      // maxDailyLoss / maxDailyTrades rules actually fire.
      const dayStart = startOfDay(Date.now())
      const s0 = useChainStore.getState()
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
      const exposure = positionManager.portfolio().grossExposure
      const sctx = toSentinelContext(ctx, {
        currentDrawdownPct: Math.max(
          0,
          (-positionManager.portfolio().unrealizedPnl / 10_000) * 100,
        ),
        currentExposurePct: Math.min(100, (exposure / 10_000) * 100),
        positionSizePct: 2,
        brokerAvailable: true,
        safeMode: false,
      })
      sctx.dailyLoss = dailyLoss
      sctx.dailyTradesCount = dailyTradesCount

      const outcome = await chain.run(ctx.contextHash, { ctx }, sctx)
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
      })
    },
  }
})

