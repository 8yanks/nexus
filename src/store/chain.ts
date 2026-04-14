import { create } from 'zustand'
import type { AuditEntry } from '@/types/audit'
import type { SentinelVeto, TradeDecision } from '@/types/decision'
import type { PaperOrder } from '@/types/order'
import { auditLogger } from '@/audit/logger'
import { AIOrchestrator, type AIProvider } from '@/ai/orchestrator'
import { SentinelEngine, type SentinelContext } from '@/sentinel/engine'
import { TraderEngine } from '@/trader/engine'
import { DecisionChain } from '@/chain'

interface ChainState {
  entries: AuditEntry[]
  vetos: SentinelVeto[]
  orders: PaperOrder[]
  decisions: TradeDecision[]
  lastOutcome: string | null
  runDemo: () => Promise<void>
  clear: () => void
}

const mockProvider = (): AIProvider => ({
  id: 'demo',
  propose: async () => {
    const action = Math.random() > 0.5 ? 'BUY' : 'SELL'
    const entry = 60000 + (Math.random() - 0.5) * 2000
    return {
      id: `dec_${Date.now().toString(36)}_${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      instrumentId: 'BTCUSD',
      symbol: 'BTC/USD',
      action,
      size: 0.1,
      entryPrice: entry,
      stopLoss: action === 'BUY' ? entry * 0.97 : entry * 1.03,
      takeProfit: action === 'BUY' ? entry * 1.05 : entry * 0.95,
      confidence: 0.55 + Math.random() * 0.4,
      riskLevel: 'medium',
      horizon: 'intraday',
      thesis: 'demo decision',
      keyFactors: ['demo'],
      invalidators: ['demo_invalid'],
      requiresHumanReview: false,
      modelSource: 'demo',
      consensusScore: null,
      _source: 'ai_orchestrator',
      _status: 'SIMULATED',
      _contextHash: 'demo_h',
    }
  },
})

const ai = new AIOrchestrator(mockProvider(), { audit: auditLogger })
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
      const ctx: SentinelContext = {
        currentDrawdownPct: Math.random() * 3,
        currentExposurePct: Math.random() * 15,
        positionSizePct: 1 + Math.random() * 2,
        dataQualityScore: 0.7 + Math.random() * 0.3,
        dataAgeMs: Math.random() * 20000,
        latencyMs: Math.random() * 2000,
        brokerAvailable: true,
        safeMode: false,
      }
      const outcome = await chain.run('demo_h', {}, ctx)
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
