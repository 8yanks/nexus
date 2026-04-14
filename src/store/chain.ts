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

export const useChainStore = create<ChainState>((set) => {
  auditLogger.subscribe(() => {
    set({ entries: auditLogger.list().slice(-500).reverse() })
  })

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
        } else if (outcome.stage === 'sentinel_vetoed') {
          next.decisions = [outcome.decision, ...s.decisions].slice(0, 50)
        } else if (outcome.stage === 'order_rejected') {
          next.decisions = [outcome.decision, ...s.decisions].slice(0, 50)
        }
        return next
      })
    },
    clear: () => {
      auditLogger.clear()
      set({ entries: [], vetos: [], orders: [], decisions: [], lastOutcome: null })
    },
  }
})
