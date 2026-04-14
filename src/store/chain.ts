import { create } from 'zustand'
import type { AuditEntry } from '@/types/audit'
import type { SentinelVeto, TradeDecision } from '@/types/decision'
import type { PaperOrder } from '@/types/order'
import { auditLogger } from '@/audit/logger'
import { AIOrchestrator } from '@/ai/orchestrator'
import { SentinelEngine } from '@/sentinel/engine'
import { TraderEngine } from '@/trader/engine'
import { DecisionChain } from '@/chain'
import {
  buildAnalystContext,
  toSentinelContext,
  type AnalystContext,
} from '@/analyst/context-builder'
import { ruleBasedProvider } from '@/ai/providers/rule-based'
import { useMarketStore } from '@/store/market'
import {
  saveDecision,
  saveVeto,
  saveOrder,
  saveAuditEntries,
  loadDecisions,
  loadOrders,
  loadVetos,
  loadAuditEntries,
  clearChainStores,
} from '@/storage/chain'

interface ChainState {
  entries: AuditEntry[]
  vetos: SentinelVeto[]
  orders: PaperOrder[]
  decisions: TradeDecision[]
  lastOutcome: string | null
  runDemo: () => Promise<void>
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

const ai = new AIOrchestrator(ruleBasedProvider(pickContext), {
  audit: auditLogger,
})
const sentinel = new SentinelEngine({ audit: auditLogger })
const trader = new TraderEngine({ audit: auditLogger })
const chain = new DecisionChain({ ai, sentinel, trader, audit: auditLogger })

// Debounced audit flush so we don't hit IDB on every log line.
let flushTimer: ReturnType<typeof setTimeout> | null = null
let pendingAudit: typeof auditLogger extends { list: () => infer T } ? T : never[] =
  [] as never
const queueAuditFlush = () => {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    const batch = pendingAudit
    pendingAudit = [] as never
    if (batch.length) void saveAuditEntries(batch).catch(() => {})
  }, 500)
}

export const useChainStore = create<ChainState>((set) => {
  auditLogger.subscribe((e) => {
    ;(pendingAudit as unknown as typeof e[]).push(e)
    queueAuditFlush()
    set({ entries: auditLogger.list().slice(-500).reverse() })
  })

  // Hydrate from IndexedDB on first use (browser only).
  if (typeof indexedDB !== 'undefined') {
    void (async () => {
      try {
        const [decisions, orders, vetos, audit] = await Promise.all([
          loadDecisions(),
          loadOrders(),
          loadVetos(),
          loadAuditEntries(),
        ])
        // Rehydrate audit logger so entries outlive reloads
        for (const e of audit.sort((a, b) => a.timestamp - b.timestamp)) {
          auditLogger.log(e.module, e.eventType, e.summary, e.data, e._source)
        }
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
    lastOutcome: null,
    runDemo: async () => {
      const ctx = pickContext()
      const sctx = toSentinelContext(ctx, {
        currentDrawdownPct: 1,
        currentExposurePct: 5,
        positionSizePct: 2,
        brokerAvailable: true,
        safeMode: false,
      })
      const outcome = await chain.run(ctx.contextHash, { ctx }, sctx)
      set((s) => {
        const next: Partial<ChainState> = { lastOutcome: outcome.stage }
        if (outcome.stage === 'filled') {
          next.decisions = [outcome.decision, ...s.decisions].slice(0, 50)
          next.orders = [outcome.order, ...s.orders].slice(0, 50)
          void saveDecision(outcome.decision).catch(() => {})
          void saveOrder(outcome.order).catch(() => {})
        } else if (outcome.stage === 'sentinel_vetoed') {
          next.decisions = [outcome.decision, ...s.decisions].slice(0, 50)
          void saveDecision(outcome.decision).catch(() => {})
        } else if (outcome.stage === 'order_rejected') {
          next.decisions = [outcome.decision, ...s.decisions].slice(0, 50)
          void saveDecision(outcome.decision).catch(() => {})
        }
        return next
      })
    },
    clear: () => {
      auditLogger.clear()
      void clearChainStores().catch(() => {})
      set({ entries: [], vetos: [], orders: [], decisions: [], lastOutcome: null })
    },
  }
})

// Persist vetos too (sentinel subscribes via the audit side effect above;
// we expose a helper for tests + future hooks).
export const persistVeto = (v: import('@/types/decision').SentinelVeto) =>
  saveVeto(v).catch(() => {})
