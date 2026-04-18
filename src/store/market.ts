import { create } from 'zustand'
import type {
  Instrument,
  MarketSnapshot,
  CandleSeries,
  SignalEvent,
  AlertRule,
  DataQualityReport,
} from '@/types'
import type { AnalyticsResult } from '@/analytics/indicators'
import type { StructureResult } from '@/analytics/structure'
import type { VolatilityResult } from '@/analytics/volatility'
import type { ReadinessResult } from '@/quality/readiness'
import type { CorrelationMatrix } from '@/analytics/correlation'
import type { DetectedPattern } from '@/analytics/patterns'

import { INSTRUMENTS } from '@/providers/registry'
import { createRegistry } from '@/providers/registry'
import type { ProviderRegistry } from '@/providers/registry'
import { computeAnalytics } from '@/analytics/indicators'
import { detectStructure } from '@/analytics/structure'
import { detectVolatilityRegime } from '@/analytics/volatility'
import { detectSignals } from '@/signals/detector'
import { addSignals } from '@/signals/journal'
import { assessAllQuality } from '@/quality/scoring'
import { computeReadiness } from '@/quality/readiness'
import { evaluateAllRules } from '@/alerts/engine'
import { notifyAll } from '@/alerts/notifier'
import { DEFAULT_RULES } from '@/alerts/rules'
import { isBinanceInstrument, getBinanceMapping } from '@/normalization/instrument'
import { computeCorrelationMatrix } from '@/analytics/correlation'
import { detectPatterns } from '@/analytics/patterns'
import { saveSnapshots, pruneOldSnapshots } from '@/storage/snapshots'
import { saveAllCandles } from '@/storage/candles'
import { saveSignals, pruneOldSignals } from '@/storage/signals'
import { corporateToSignals, macroToSignals } from '@/signals/corporate-bridge'
import { createMockCorporateProvider } from '@/corporate/mock'
import { createMockMacroProvider } from '@/macro/mock'

// ─── SCREEN TYPE ────────────────────────────────────────────

export type Screen =
  | 'dashboard'
  | 'detail'
  | 'scanner'
  | 'alerts'
  | 'quality'
  | 'sources'
  | 'export'
  | 'journal'
  | 'correlation'
  | 'backtest'
  | 'corporate'
  | 'vcflow'
  | 'macro'
  | 'chain'
  | 'sentinel'
  | 'trader'
  | 'options'

// ─── STORE SHAPE ────────────────────────────────────────────

export interface MarketStore {
  // Data
  instruments: Instrument[]
  snapshots: Record<string, MarketSnapshot>
  candles: Record<string, CandleSeries>
  analytics: Record<string, AnalyticsResult | null>
  structures: Record<string, StructureResult | null>
  volatility: Record<string, VolatilityResult>
  signals: SignalEvent[]
  alertRules: AlertRule[]
  quality: Record<string, DataQualityReport>
  readiness: ReadinessResult | null
  correlation: CorrelationMatrix | null
  patterns: Record<string, DetectedPattern[]>

  // UI state
  screen: Screen
  selectedInstrumentId: string | null
  refreshInterval: number | null

  // Infra
  registry: ProviderRegistry
  lastRefresh: string | null
  binanceConnected: boolean

  // Actions
  setScreen: (screen: Screen) => void
  selectInstrument: (id: string) => void
  connectProviders: () => Promise<void>
  refreshAll: () => Promise<void>
  startAutoRefresh: (intervalMs?: number) => void
  stopAutoRefresh: () => void
  addAlertRule: (rule: AlertRule) => void
  removeAlertRule: (ruleId: string) => void
  toggleAlertRule: (ruleId: string) => void
}

// ─── PROVIDER ROUTING ───────────────────────────────────────
// Returns the correct provider ID for a given instrument.

const getProviderId = (instrumentId: string): string => {
  const mapping = getBinanceMapping(instrumentId)
  if (!mapping) return 'mock'
  return mapping.type === 'spot' ? 'binance_spot' : 'binance_futures'
}

export const useMarketStore = create<MarketStore>((set, get) => ({
  // ── Initial state ───────────────────────────────────────
  instruments: INSTRUMENTS,
  snapshots: {},
  candles: {},
  analytics: {},
  structures: {},
  volatility: {},
  signals: [],
  alertRules: [...DEFAULT_RULES],
  quality: {},
  readiness: null,
  correlation: null,
  patterns: {},
  screen: 'dashboard',
  selectedInstrumentId: null,
  refreshInterval: null,
  registry: createRegistry(),
  lastRefresh: null,
  binanceConnected: false,

  // ── Navigation ──────────────────────────────────────────
  setScreen: (screen) => set({ screen }),

  selectInstrument: (id) =>
    set({ selectedInstrumentId: id, screen: 'detail' }),

  // ── Connect live providers ─────────────────────────────
  connectProviders: async () => {
    const { registry, binanceConnected } = get()
    if (binanceConnected) return

    try {
      console.log('[Store] Connecting Binance providers...')
      await Promise.all([
        registry['binance_spot'].connect(),
        registry['binance_futures'].connect(),
      ])
      set({ binanceConnected: true })
      console.log('[Store] Binance providers connected')
    } catch (err) {
      console.error('[Store] Failed to connect Binance:', err)
      // Fallback: mock will be used for crypto instruments
    }
  },

  // ── Core refresh cycle ──────────────────────────────────
  refreshAll: async () => {
    const { instruments, registry, alertRules, analytics: prevAnalytics, binanceConnected } = get()

    // 1. Fetch snapshots + candles for all instruments
    const snapshots: Record<string, MarketSnapshot> = {}
    const candles: Record<string, CandleSeries> = {}

    await Promise.all(
      instruments.map(async (inst) => {
        const isBinance = isBinanceInstrument(inst.id) && binanceConnected
        const providerId = isBinance ? getProviderId(inst.id) : 'mock'
        const provider = registry[providerId]

        try {
          snapshots[inst.id] = await provider.getSnapshot(inst.id)
          candles[inst.id] = await provider.getCandles(inst.id, '1h', 200)
        } catch {
          // Fallback to mock if live provider fails
          if (providerId !== 'mock') {
            try {
              snapshots[inst.id] = await registry['mock'].getSnapshot(inst.id)
              candles[inst.id] = await registry['mock'].getCandles(inst.id, '1h', 200)
            } catch {
              // Skip instrument entirely
            }
          }
        }
      }),
    )

    // 2. Compute analytics
    const analyticsMap: Record<string, AnalyticsResult | null> = {}
    const structureMap: Record<string, StructureResult | null> = {}
    const volatilityMap: Record<string, VolatilityResult> = {}

    for (const inst of instruments) {
      const series = candles[inst.id]
      analyticsMap[inst.id] = series ? computeAnalytics(series) : null

      structureMap[inst.id] = series
        ? detectStructure(series.candles)
        : null

      // Build ATR series for volatility regime
      if (series && series.candles.length > 30) {
        const atrSeries: number[] = []
        for (let i = 15; i <= series.candles.length; i++) {
          const slice = series.candles.slice(0, i)
          const trs = slice.slice(-15).map((c, j, arr) => {
            if (j === 0) return 0
            const prev = arr[j - 1]
            return Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close))
          }).slice(1)
          atrSeries.push(trs.reduce((a, b) => a + b, 0) / trs.length)
        }
        volatilityMap[inst.id] = detectVolatilityRegime(atrSeries, 20, snapshots[inst.id]?.price ?? null)
      } else {
        volatilityMap[inst.id] = { regime: 'normal', atrZScore: null, normalizedAtr: null }
      }
    }

    // 3. Detect signals (technical + corporate + macro)
    const newSignals: SignalEvent[] = []
    for (const inst of instruments) {
      const a = analyticsMap[inst.id]
      const snap = snapshots[inst.id]
      if (a && snap) {
        const prev = prevAnalytics[inst.id] ?? null
        const sigs = detectSignals(inst.id, snap.price, a, structureMap[inst.id], prev)
        newSignals.push(...sigs)
      }
    }

    // Corporate & Macro signals (from mock providers)
    try {
      const corpProvider = createMockCorporateProvider()
      const macroProvider = createMockMacroProvider()
      const [corpEvents, macroIndicators] = await Promise.all([
        corpProvider.getAllEvents(),
        macroProvider.getIndicators(),
      ])
      newSignals.push(...corporateToSignals(corpEvents))
      newSignals.push(...macroToSignals(macroIndicators))
    } catch {
      // Non-critical — continue without corporate/macro signals
    }

    addSignals(newSignals)

    // 4. Pattern recognition
    const patternsMap: Record<string, DetectedPattern[]> = {}
    for (const inst of instruments) {
      const series = candles[inst.id]
      if (series && series.candles.length >= 30) {
        patternsMap[inst.id] = detectPatterns(series.candles)
      } else {
        patternsMap[inst.id] = []
      }
    }

    // 5. Correlation matrix
    const correlationIds = instruments.map((i) => i.id)
    const correlationMatrix = computeCorrelationMatrix(candles, correlationIds, 50)

    // 6. Assess quality
    const quality = assessAllQuality(instruments, snapshots)
    const readiness = computeReadiness(quality)

    // 6. Evaluate alerts
    for (const inst of instruments) {
      const snap = snapshots[inst.id]
      if (snap) {
        const evals = evaluateAllRules(alertRules, snap, analyticsMap[inst.id])
        notifyAll(evals)
      }
    }

    set({
      snapshots,
      candles,
      analytics: analyticsMap,
      structures: structureMap,
      volatility: volatilityMap,
      signals: newSignals,
      quality,
      readiness,
      correlation: correlationMatrix,
      patterns: patternsMap,
      lastRefresh: new Date().toISOString(),
    })

    // 7. Persist to IndexedDB (fire-and-forget, non-blocking)
    saveSnapshots(snapshots).catch(() => {})
    saveAllCandles(candles).catch(() => {})
    saveSignals(newSignals).catch(() => {})
  },

  // ── Auto-refresh ────────────────────────────────────────
  startAutoRefresh: (intervalMs = 5000) => {
    const { refreshInterval } = get()
    if (refreshInterval != null) return
    // Prune old data, connect providers, then start refreshing
    Promise.all([
      pruneOldSnapshots().catch(() => {}),
      pruneOldSignals().catch(() => {}),
    ]).then(() => get().connectProviders()).then(() => {
      get().refreshAll()
    })
    const id = window.setInterval(() => {
      get().refreshAll()
    }, intervalMs)
    set({ refreshInterval: id })
  },

  stopAutoRefresh: () => {
    const { refreshInterval } = get()
    if (refreshInterval != null) {
      window.clearInterval(refreshInterval)
      set({ refreshInterval: null })
    }
  },

  // ── Alert CRUD ──────────────────────────────────────────
  addAlertRule: (rule) =>
    set((s) => ({ alertRules: [...s.alertRules, rule] })),

  removeAlertRule: (ruleId) =>
    set((s) => ({ alertRules: s.alertRules.filter((r) => r.id !== ruleId) })),

  toggleAlertRule: (ruleId) =>
    set((s) => ({
      alertRules: s.alertRules.map((r) =>
        r.id === ruleId ? { ...r, active: !r.active } : r,
      ),
    })),
}))
