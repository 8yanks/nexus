import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useMarketStore } from '@/store/market'
import { useAnalytics } from '@/hooks/useAnalytics'
import { StatusBadge } from '@/ui/components/StatusBadge'
import { PriceChange } from '@/ui/components/PriceChange'
import { QualityBar } from '@/ui/components/QualityBar'
import { TradingViewChart } from '@/ui/components/TradingViewChart'
import { PerformanceStrip } from '@/ui/components/PerformanceStrip'
import { fmt, fmtVol, fmtPct } from '@/utils/format'
import { safeFixed, isValidNumber } from '@/utils/math'
import { colors, fonts, card, sectionHeader, statLabel, statValue, emptyState } from '@/ui/theme'
import { ScreenHeader } from '@/ui/components/ScreenHeader'
import type { DetectedPattern } from '@/analytics/patterns'
import { computePerformance, computeKeyStats } from '@/analytics/performance'
import { VALID_TIMEFRAMES, type Timeframe } from '@/ui/timeframe-memory'

// localStorage key for the Bollinger Bands chart toggle. Persisted so a
// user who turned bands on once doesn't have to re-toggle them on every
// instrument change. Same `nexus_*` namespace as the other UI prefs
// (sidebar collapse, focus pane height).
const BB_TOGGLE_KEY = 'nexus_detail_bb_overlay'
// Same pattern for the Donchian Channels toggle — independent storage
// slot so the two overlays can be enabled/disabled without dragging
// each other along.
const DC_TOGGLE_KEY = 'nexus_detail_dc_overlay'
// Backtest trade markers toggle — only meaningful when the store
// holds a backtest result for the selected instrument. The pill
// renders conditionally; when there's no result the toggle is hidden
// entirely (showing it disabled would just be visual noise).
const BT_TOGGLE_KEY = 'nexus_detail_bt_overlay'

const loadOverlayToggle = (key: string): boolean => {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}
const saveOverlayToggle = (key: string, v: boolean) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, v ? '1' : '0')
  } catch {
    /* swallow — storage may be disabled */
  }
}

// Stable empty-pattern reference — used as the `patterns` fallback so we don't
// emit a new array literal on every render (which would trip zustand's
// ref-equality check and re-render forever).
const EMPTY_PATTERNS: DetectedPattern[] = []

// ─── STAT PAIR ──────────────────────────────────────────────

const Stat = ({ label, value, color, mono = true }: { label: string; value: string; color?: string; mono?: boolean }) => (
  <div style={{ marginBottom: 8 }}>
    <div style={statLabel}>{label}</div>
    <div style={{ ...statValue, fontSize: 13, color: color ?? colors.text, fontFamily: mono ? fonts.mono : fonts.sans }}>
      {value}
    </div>
  </div>
)

export const Detail = () => {
  const instrumentId = useMarketStore((s) => s.selectedInstrumentId)
  const instruments = useMarketStore((s) => s.instruments)
  const snapshots = useMarketStore((s) => s.snapshots)
  const candleMap = useMarketStore((s) => s.candles)
  const quality = useMarketStore((s) => s.quality)
  const signals = useMarketStore((s) => s.signals)
  const setScreen = useMarketStore((s) => s.setScreen)
  const selectedTimeframe = useMarketStore((s) => s.selectedTimeframe)
  const setTimeframe = useMarketStore((s) => s.setTimeframe)
  // Backtest results map — read the slice (stable reference) and
  // resolve the per-instrument entry below so we don't trigger zustand
  // re-renders on unrelated instrument runs.
  const backtestResultsMap = useMarketStore((s) => s.backtestResults)
  const backtestResult = instrumentId ? backtestResultsMap[instrumentId] : undefined

  const inst = instruments.find((i) => i.id === instrumentId)
  const snap = instrumentId ? snapshots[instrumentId] : undefined
  const series = instrumentId ? candleMap[instrumentId] : undefined
  const q = instrumentId ? quality[instrumentId] : undefined
  const instSignals = signals.filter((s) => s.instrumentId === instrumentId)
  const { analytics, structure, volatility } = useAnalytics(instrumentId)
  // Read the raw map slice (stable reference) and resolve the per-instrument
  // entry below — using `?? []` inside the selector returns a fresh array
  // every render and triggers a zustand re-render loop when the entry is missing.
  const patternsMap = useMarketStore((s) => s.patterns)
  const patterns = instrumentId ? patternsMap[instrumentId] ?? EMPTY_PATTERNS : EMPTY_PATTERNS

  // Bollinger Bands chart overlay — opt-in toggle, persisted to
  // localStorage so the preference sticks across instrument changes.
  const [showBB, setShowBB] = useState<boolean>(() => loadOverlayToggle(BB_TOGGLE_KEY))
  useEffect(() => saveOverlayToggle(BB_TOGGLE_KEY, showBB), [showBB])
  // Donchian Channels overlay — same shape as BB; both toggle pills
  // sit side-by-side in the chart toolbar.
  const [showDC, setShowDC] = useState<boolean>(() => loadOverlayToggle(DC_TOGGLE_KEY))
  useEffect(() => saveOverlayToggle(DC_TOGGLE_KEY, showDC), [showDC])
  // Backtest trade markers — opt-in toggle, persisted so a user who
  // cares about strategy validation keeps the markers across sessions.
  // The pill below only renders when `backtestResult` is non-null for
  // the selected instrument.
  const [showBT, setShowBT] = useState<boolean>(() => loadOverlayToggle(BT_TOGGLE_KEY))
  useEffect(() => saveOverlayToggle(BT_TOGGLE_KEY, showBT), [showBT])

  if (!inst || !snap) {
    return (
      <div style={emptyState}>
        <p>No instrument selected</p>
        <button
          onClick={() => setScreen('dashboard')}
          style={{ color: colors.accent, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  const isForex = inst.assetClass === 'forex'
  const decimals = isForex ? 5 : 2
  // Pass the raw candle window straight to TradingViewChart — it handles
  // its own time/volume formatting internally and needs the OHLC fields.
  const chartCandles = series?.candles.slice(-60) ?? []

  // Performance + key stats are computed from the full 200-bar window so
  // 7D (168 bars) stays reachable. Pure compute, no extra fetch.
  const allCandles = series?.candles ?? []
  const performancePoints = computePerformance(allCandles)
  const keyStats = computeKeyStats(allCandles, snap.price, snap.low24h, snap.high24h)

  return (
    <>
      <ScreenHeader
        title={inst.symbol}
        subtitle={`${inst.name} — ${inst.exchange}`}
        badge={<StatusBadge status={snap._status} />}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  fontFamily: fonts.mono,
                  color: colors.text,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                }}
              >
                {fmt(snap.price, decimals)}
              </div>
              <PriceChange
                change={snap.change24h}
                suffix="24h"
                title={`Rolling 24h change from ${inst.exchange}. May differ from TradingView/Google because those show "since midnight" or aggregate exchanges.`}
              />
            </div>
            <button
              onClick={() => setScreen('dashboard')}
              title="Back to Dashboard (Esc)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: 'none',
                border: `1px solid ${colors.border}`,
                cursor: 'pointer',
                color: colors.textSecondary,
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 11,
                fontFamily: fonts.sans,
              }}
            >
              <ArrowLeft size={13} /> back
            </button>
          </div>
        }
      />
      <div style={{ padding: '14px 20px' }}>
      {/* Performance strip — TradingView-style % over 1H/6H/1D/3D/7D.
          Pure compute on the candle window already in-store. */}
      <div style={{ marginBottom: 12 }}>
        <PerformanceStrip points={performancePoints} />
      </div>

      {/* Chart + Key Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 12, marginBottom: 12 }}>
        <div style={{ ...card, padding: 0, overflow: 'hidden', position: 'relative' }}>
          {chartCandles.length > 2 ? (
            <>
              {/* Chart toolbar — overlay toggles + timeframe picker.
                  Anchored top-right inside the card so it floats over the
                  chart's top margin (above the price scale labels). Visual
                  order is: TF picker (left) → overlay toggles (right). */}
              <div
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 60,
                  display: 'flex',
                  gap: 6,
                  alignItems: 'center',
                  zIndex: 2,
                }}
                data-testid="detail-chart-toolbar"
              >
                {/* Timeframe picker — drives store.selectedTimeframe, which
                    `refreshAll` reads on every tick. Click triggers an
                    immediate refresh inside the store action so the chart
                    updates within the same paint instead of waiting for the
                    next 5s tick. */}
                <div
                  role="group"
                  aria-label="Chart timeframe"
                  data-testid="detail-tf-picker"
                  style={{
                    display: 'inline-flex',
                    border: `1px solid ${colors.border}`,
                    borderRadius: 3,
                    overflow: 'hidden',
                    background: `${colors.bg}b0`,
                  }}
                >
                  {VALID_TIMEFRAMES.map((tf: Timeframe, i) => {
                    const active = tf === selectedTimeframe
                    return (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => setTimeframe(tf)}
                        aria-pressed={active}
                        title={`Show ${tf} candles`}
                        data-testid={`detail-tf-${tf}`}
                        style={{
                          padding: '2px 6px',
                          fontSize: 10,
                          fontFamily: fonts.mono,
                          // Internal divider between pills, not on the first one.
                          borderLeft: i === 0 ? 'none' : `1px solid ${colors.border}`,
                          borderTop: 'none',
                          borderRight: 'none',
                          borderBottom: 'none',
                          background: active ? `${colors.accent}20` : 'transparent',
                          color: active ? colors.accent : colors.textMuted,
                          cursor: 'pointer',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {tf}
                      </button>
                    )
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setShowBB((v) => !v)}
                  aria-pressed={showBB}
                  title={showBB ? 'Hide Bollinger Bands (20, 2σ)' : 'Show Bollinger Bands (20, 2σ)'}
                  data-testid="detail-bb-toggle"
                  style={{
                    padding: '2px 8px',
                    fontSize: 10,
                    fontFamily: fonts.mono,
                    border: `1px solid ${showBB ? colors.purple : colors.border}`,
                    borderRadius: 3,
                    background: showBB ? `${colors.purple}20` : `${colors.bg}b0`,
                    color: showBB ? colors.purple : colors.textMuted,
                    cursor: 'pointer',
                    letterSpacing: '0.04em',
                  }}
                >
                  BB
                </button>
                <button
                  type="button"
                  onClick={() => setShowDC((v) => !v)}
                  aria-pressed={showDC}
                  title={showDC ? 'Hide Donchian Channels (20)' : 'Show Donchian Channels (20)'}
                  data-testid="detail-dc-toggle"
                  style={{
                    padding: '2px 8px',
                    fontSize: 10,
                    fontFamily: fonts.mono,
                    border: `1px solid ${showDC ? colors.cyan : colors.border}`,
                    borderRadius: 3,
                    background: showDC ? `${colors.cyan}20` : `${colors.bg}b0`,
                    color: showDC ? colors.cyan : colors.textMuted,
                    cursor: 'pointer',
                    letterSpacing: '0.04em',
                  }}
                >
                  DC
                </button>
                {/* Backtest markers — only meaningful when a result
                    exists in the store for this instrument. Hidden
                    entirely otherwise to avoid a "what does this do?"
                    pill that does nothing. */}
                {backtestResult && (
                  <button
                    type="button"
                    onClick={() => setShowBT((v) => !v)}
                    aria-pressed={showBT}
                    title={showBT
                      ? `Hide backtest markers (${backtestResult.trades.length} trades)`
                      : `Show backtest markers (${backtestResult.trades.length} trades)`}
                    data-testid="detail-bt-toggle"
                    style={{
                      padding: '2px 8px',
                      fontSize: 10,
                      fontFamily: fonts.mono,
                      border: `1px solid ${showBT ? colors.green : colors.border}`,
                      borderRadius: 3,
                      background: showBT ? `${colors.green}20` : `${colors.bg}b0`,
                      color: showBT ? colors.green : colors.textMuted,
                      cursor: 'pointer',
                      letterSpacing: '0.04em',
                    }}
                  >
                    BT {backtestResult.trades.length}
                  </button>
                )}
              </div>
              <TradingViewChart
                candles={chartCandles}
                decimals={decimals}
                height={240}
                markers={instSignals}
                bollinger={showBB ? { period: 20, stdDev: 2 } : null}
                donchian={showDC ? { period: 20 } : null}
                tradeMarkers={showBT && backtestResult ? backtestResult.trades : []}
              />
            </>
          ) : (
            <div style={emptyState}>Insufficient candle data for chart</div>
          )}
        </div>

        {/* Key stats sidebar */}
        <div style={card}>
          <div style={sectionHeader}>Market Data</div>
          <Stat label="Bid / Ask" value={`${fmt(snap.bid, decimals)} / ${fmt(snap.ask, decimals)}`} />
          <Stat label="Spread" value={`${fmt(snap.spreadBps)} bps`} />
          <Stat label="24h Range" value={`${fmt(snap.low24h, decimals)} — ${fmt(snap.high24h, decimals)}`} />
          {/* Range position — where we sit in today's low→high band.
              A TradingView staple; 0% = at the low, 100% = at the high. */}
          {keyStats.rangePosition24h != null && (
            <div style={{ marginBottom: 8 }}>
              <div style={statLabel}>Range Position</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <div style={{ position: 'relative', flex: 1, height: 6, background: colors.bgHover, borderRadius: 3 }}>
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: `${keyStats.rangePosition24h * 100}%`,
                      transform: 'translateX(-50%)',
                      width: 3,
                      height: 6,
                      borderRadius: 2,
                      background: colors.accent,
                    }}
                  />
                </div>
                <span style={{ fontSize: 11, fontFamily: fonts.mono, color: colors.textSecondary, minWidth: 38, textAlign: 'right' }}>
                  {(keyStats.rangePosition24h * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}
          <Stat label="Volume 24h" value={fmtVol(snap.volume24h)} />
          {keyStats.relativeVolume != null && (
            <Stat
              label={`Rel. Vol. (${keyStats.relativeVolumeBase}b)`}
              value={`${safeFixed(keyStats.relativeVolume, 2)}x`}
              color={
                keyStats.relativeVolume > 2.5 ? colors.yellow
                : keyStats.relativeVolume < 0.5 ? colors.textDim
                : undefined
              }
            />
          )}
          {keyStats.athWindow != null && keyStats.atlWindow != null && (
            <Stat
              label="Window H / L"
              value={`${fmt(keyStats.athWindow, decimals)} / ${fmt(keyStats.atlWindow, decimals)}`}
            />
          )}
          {snap.vwap != null && (
            <Stat label="VWAP 24h" value={fmt(snap.vwap, decimals)} />
          )}
          {snap.openInterest != null && <Stat label="Open Interest" value={fmtVol(snap.openInterest)} />}
          {snap.fundingRate != null && <Stat label="Funding" value={fmtPct(snap.fundingRate)} color={
            isValidNumber(snap.fundingRate)
              ? snap.fundingRate > 0.001 ? colors.red : snap.fundingRate < -0.001 ? colors.green : colors.textSecondary
              : undefined
          } />}
        </div>
      </div>

      {/* 4-panel grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
        {/* Analytics */}
        <div style={card}>
          <div style={sectionHeader}>Analytics</div>
          {analytics ? (
            <>
              <Stat label="RSI (14)" value={safeFixed(analytics.rsi, 1)} color={
                isValidNumber(analytics.rsi)
                  ? analytics.rsi > 70 ? colors.red : analytics.rsi < 30 ? colors.green : undefined
                  : undefined
              } />
              <Stat label="EMA 20 / 50" value={`${fmt(analytics.ema20, decimals)} / ${fmt(analytics.ema50, decimals)}`} />
              <Stat label="EMA 200" value={fmt(analytics.ema200, decimals)} />
              <Stat label="ATR (14)" value={fmt(analytics.atr, decimals)} />
              <Stat label="VWAP" value={fmt(analytics.vwap, decimals)} />
              <Stat label="BB Width" value={analytics.bollinger ? `${safeFixed(analytics.bollinger.bandwidth * 100, 2)}%` : '—'} />
              <Stat label="Z-Score" value={safeFixed(analytics.zScore, 2)} />
              <Stat label="Rel. Volume" value={analytics.relativeVolume != null ? `${safeFixed(analytics.relativeVolume, 1)}x` : '—'} color={
                isValidNumber(analytics.relativeVolume) && analytics.relativeVolume > 2.5 ? colors.yellow : undefined
              } />
            </>
          ) : (
            <div style={{ color: colors.textDim, fontSize: 11 }}>Insufficient data</div>
          )}
          {structure && (
            <Stat label="Structure" value={`${structure.trend.toUpperCase()}`} color={
              structure.trend === 'bullish' ? colors.green : structure.trend === 'bearish' ? colors.red : colors.textMuted
            } />
          )}
          {volatility && (
            <Stat label="Vol. Regime" value={volatility.regime.toUpperCase()} color={
              volatility.regime === 'expansion' ? colors.red : volatility.regime === 'compression' ? colors.cyan : colors.textMuted
            } />
          )}
        </div>

        {/* Signals */}
        <div style={card}>
          <div style={sectionHeader}>Signals ({instSignals.length})</div>
          {instSignals.length === 0 ? (
            <div style={{ color: colors.textDim, fontSize: 11 }}>No active signals</div>
          ) : (
            instSignals.map((s) => {
              const dirColor = s.direction === 'bullish' ? colors.green : s.direction === 'bearish' ? colors.red : colors.yellow
              return (
                <div
                  key={s.id}
                  style={{
                    padding: '6px 8px',
                    marginBottom: 4,
                    borderRadius: 4,
                    background: `${dirColor}10`,
                    borderLeft: `2px solid ${dirColor}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: colors.text, fontSize: 12 }}>{s.type.replace(/_/g, ' ')}</span>
                    <span style={{ fontFamily: fonts.mono, fontSize: 10, color: dirColor }}>{safeFixed(s.strength * 100, 0)}%</span>
                  </div>
                  <div style={{ color: colors.textMuted, fontSize: 10, marginTop: 2 }}>{s.description}</div>
                </div>
              )
            })
          )}
        </div>

        {/* Patterns */}
        <div style={card}>
          <div style={sectionHeader}>Patterns ({patterns.length})</div>
          {patterns.length === 0 ? (
            <div style={{ color: colors.textDim, fontSize: 11 }}>No patterns detected</div>
          ) : (
            patterns.map((p, i) => {
              const c = p.direction === 'bullish' ? colors.green : colors.red
              return (
                <div
                  key={i}
                  style={{
                    padding: '6px 8px',
                    marginBottom: 4,
                    borderRadius: 4,
                    background: `${c}10`,
                    borderLeft: `2px solid ${c}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: colors.text, fontSize: 12 }}>{p.type.replace(/_/g, ' ')}</span>
                    <span style={{ fontFamily: fonts.mono, fontSize: 10, color: c }}>{safeFixed(p.confidence * 100, 0)}%</span>
                  </div>
                  <div style={{ color: colors.textMuted, fontSize: 10, marginTop: 2 }}>{p.description}</div>
                  <div style={{ fontSize: 9, color: colors.textDim, marginTop: 2 }}>
                    Neckline {fmt(p.neckline, decimals)} — {p.keyPoints.length} key points
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Quality */}
        <div style={card}>
          <div style={sectionHeader}>Data Quality</div>
          {q ? (
            <>
              <Stat label="Overall Score" value={`${safeFixed(q.overallScore * 100, 0)}%`} />
              <div style={{ marginBottom: 6 }}>
                <QualityBar score={q.completeness} width={100} />
                <span style={{ fontSize: 10, color: colors.textMuted, marginLeft: 8 }}>Completeness</span>
              </div>
              <div style={{ marginBottom: 6 }}>
                <QualityBar score={q.freshness} width={100} />
                <span style={{ fontSize: 10, color: colors.textMuted, marginLeft: 8 }}>Freshness</span>
              </div>
              <div style={{ marginBottom: 6 }}>
                <QualityBar score={q.reliability} width={100} />
                <span style={{ fontSize: 10, color: colors.textMuted, marginLeft: 8 }}>Reliability</span>
              </div>
              {q.issues.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  {q.issues.map((issue, i) => (
                    <div key={i} style={{ fontSize: 10, color: colors.yellow, marginBottom: 2 }}>
                      {issue}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ color: colors.textDim, fontSize: 11 }}>No quality data</div>
          )}
        </div>
      </div>
      </div>
    </>
  )
}
