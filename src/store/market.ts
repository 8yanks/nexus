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
import type { BacktestResult } from '@/backtest/types'

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
import { isBinanceInstrument, getBinanceMapping, isCoinbaseInstrument, isKrakenInstrument } from '@/normalization/instrument'
import { computeCorrelationMatrix } from '@/analytics/correlation'
import { detectPatterns } from '@/analytics/patterns'
import { saveSnapshots, pruneOldSnapshots } from '@/storage/snapshots'
import { saveAllCandles } from '@/storage/candles'
import { saveSignals, pruneOldSignals } from '@/storage/signals'
import { corporateToSignals, macroToSignals } from '@/signals/corporate-bridge'
import { createMockCorporateProvider } from '@/corporate/mock'
import { createMockMacroProvider } from '@/macro/mock'
import { loadScreenState, saveScreenState } from '@/ui/screen-memory'
import {
  loadTimeframeState,
  saveTimeframeState,
  DEFAULT_TIMEFRAME,
  type Timeframe,
} from '@/ui/timeframe-memory'

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
  /**
   * Per-instrument backtest results. Populated by the Backtest screen
   * after a run completes; consumed by the Detail screen's chart so
   * trade entry/exit markers can be overlaid on the live candles for
   * the same instrument. Keyed by `instrumentId` — only the most
   * recent run per instrument is kept (a fresh run on the same
   * instrument overwrites the previous result).
   */
  backtestResults: Record<string, BacktestResult>

  // UI state
  screen: Screen
  selectedInstrumentId: string | null
  /** Active chart timeframe — drives `refreshAll` and the picker UI on
   *  Detail. Persisted to localStorage so reload restores it. */
  selectedTimeframe: Timeframe
  refreshInterval: number | null

  // Infra
  registry: ProviderRegistry
  lastRefresh: string | null
  binanceConnected: boolean
  coinbaseConnected: boolean
  krakenConnected: boolean

  // Actions
  setScreen: (screen: Screen) => void
  selectInstrument: (id: string) => void
  /**
   * Focus an instrument WITHOUT navigating. Used by the Dashboard
   * split-view (left watchlist row → right preview pane) where a
   * single click focuses, a double click drills into Detail.
   */
  focusInstrument: (id: string) => void
  /** Set the active chart timeframe + persist + trigger an immediate
   *  refresh so the new TF lands in the chart on the next tick. */
  setTimeframe: (tf: Timeframe) => void
  /** Save the most recent backtest result for an instrument so the
   *  Detail screen can surface its trade markers on the live chart.
   *  Replaces any prior result for the same instrument. */
  setBacktestResult: (result: BacktestResult) => void
  /** Drop the saved backtest result for one instrument. Pass no arg
   *  to clear all of them (used by Backtest's Reset button). */
  clearBacktestResult: (instrumentId?: string) => void
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

// ─── INITIAL SCREEN — restored from localStorage ────────────
// Survives the reload triggered by `setTheme` / `setDensity` /
// `applyWorkspace`. Falls back to dashboard on first visit, stale
// schema, or corrupted storage — see `screen-memory.ts` for the
// validation path.
const _restoredScreen = loadScreenState()
const _initialScreen: Screen = _restoredScreen?.screen ?? 'dashboard'
const _initialSelectedInstrumentId: string | null =
  _restoredScreen?.selectedInstrumentId ?? null

// ─── INITIAL TIMEFRAME — restored from localStorage ─────────
// Same survival story as `_initialScreen` above. Falls back to the
// shared `DEFAULT_TIMEFRAME` ('1h') so first-load behaviour is
// identical to the pre-multi-TF era — Binance/Coinbase keep using
// the WS-tracked 1h candles unless the user explicitly picks something
// shorter or longer.
const _initialTimeframe: Timeframe =
  loadTimeframeState() ?? DEFAULT_TIMEFRAME

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
  backtestResults: {},
  screen: _initialScreen,
  selectedInstrumentId: _initialSelectedInstrumentId,
  selectedTimeframe: _initialTimeframe,
  refreshInterval: null,
  registry: createRegistry(),
  lastRefresh: null,
  binanceConnected: false,
  coinbaseConnected: false,
  krakenConnected: false,

  // ── Navigation ──────────────────────────────────────────
  // Persist on every screen change so a theme/density/workspace
  // reload lands the user back where they were instead of the
  // default dashboard. Writing is cheap (single localStorage call)
  // and scoped to navigation — no per-frame churn.
  setScreen: (screen) => {
    set({ screen })
    saveScreenState(screen, get().selectedInstrumentId)
  },

  selectInstrument: (id) => {
    set({ selectedInstrumentId: id, screen: 'detail' })
    saveScreenState('detail', id)
  },

  // Focus-only — no screen change. The Dashboard split-view uses this
  // on single-click to update the right preview pane while keeping the
  // user on the dashboard. We still persist so a reload restores the
  // last-focused instrument alongside the current screen.
  focusInstrument: (id) => {
    set({ selectedInstrumentId: id })
    saveScreenState(get().screen, id)
  },

  // ── Timeframe picker ────────────────────────────────────
  // Persist on change AND kick off an immediate `refreshAll` so the
  // chart updates within the same paint instead of waiting for the
  // next 5s store tick. No-op when the picker is set to the current
  // value to keep the click-the-active-pill case free.
  setTimeframe: (tf) => {
    if (get().selectedTimeframe === tf) return
    set({ selectedTimeframe: tf })
    saveTimeframeState(tf)
    // Fire-and-forget — refreshAll catches its own errors via the
    // per-instrument provider chain. We don't await because callers
    // (a button click handler) shouldn't block on a network round-trip.
    void get().refreshAll()
  },

  // ── Backtest results ────────────────────────────────────
  // Lifted from Backtest.tsx local state so the Detail screen can
  // surface the trade markers on the live chart for the same
  // instrument. Storage is in-memory only — backtests are cheap to
  // re-run and persisting MB-scale results to localStorage would push
  // up against quota fast.
  setBacktestResult: (result) =>
    set((s) => ({
      backtestResults: {
        ...s.backtestResults,
        [result.config.instrumentId]: result,
      },
    })),

  clearBacktestResult: (instrumentId) =>
    set((s) => {
      if (instrumentId == null) return { backtestResults: {} }
      const next = { ...s.backtestResults }
      delete next[instrumentId]
      return { backtestResults: next }
    }),

  // ── Connect live providers ─────────────────────────────
  // Each exchange connects independently — a Coinbase outage doesn't
  // block Binance and vice-versa. The refreshAll fallback chain
  // (binance → coinbase → mock) routes per-instrument based on which
  // providers actually reported success.
  connectProviders: async () => {
    const { registry, binanceConnected, coinbaseConnected, krakenConnected } = get()

    if (!binanceConnected) {
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
      }
    }

    if (!coinbaseConnected) {
      try {
        console.log('[Store] Connecting Coinbase provider...')
        await registry['coinbase'].connect()
        set({ coinbaseConnected: true })
        console.log('[Store] Coinbase provider connected')
      } catch (err) {
        console.error('[Store] Failed to connect Coinbase:', err)
      }
    }

    if (!krakenConnected) {
      try {
        console.log('[Store] Connecting Kraken provider...')
        await registry['kraken'].connect()
        set({ krakenConnected: true })
        console.log('[Store] Kraken provider connected')
      } catch (err) {
        console.error('[Store] Failed to connect Kraken:', err)
      }
    }
  },

  // ── Core refresh cycle ──────────────────────────────────
  refreshAll: async () => {
    const { instruments, registry, alertRules, analytics: prevAnalytics, binanceConnected, coinbaseConnected, krakenConnected, selectedTimeframe } = get()

    // 1. Fetch snapshots + candles for all instruments.
    // Per-instrument provider chain (try in order, fall back on throw):
    //   crypto spot → binance_spot → coinbase → kraken → mock
    //   crypto perp → binance_futures → mock
    //   anything else → mock
    // Each step is gated by the corresponding `*Connected` flag, so
    // we don't waste a request on a provider that failed to start.
    const snapshots: Record<string, MarketSnapshot> = {}
    const candles: Record<string, CandleSeries> = {}

    const buildProviderChain = (instrumentId: string): string[] => {
      const chain: string[] = []
      if (isBinanceInstrument(instrumentId) && binanceConnected) {
        chain.push(getProviderId(instrumentId))
      }
      if (isCoinbaseInstrument(instrumentId) && coinbaseConnected) {
        chain.push('coinbase')
      }
      if (isKrakenInstrument(instrumentId) && krakenConnected) {
        chain.push('kraken')
      }
      chain.push('mock')
      return chain
    }

    await Promise.all(
      instruments.map(async (inst) => {
        const chain = buildProviderChain(inst.id)
        for (const providerId of chain) {
          const provider = registry[providerId]
          if (!provider) continue
          try {
            snapshots[inst.id] = await provider.getSnapshot(inst.id)
            candles[inst.id] = await provider.getCandles(inst.id, selectedTimeframe, 200)
            return
          } catch {
            // Try next provider in the chain
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
