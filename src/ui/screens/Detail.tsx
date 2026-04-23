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
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          {chartCandles.length > 2 ? (
            <TradingViewChart candles={chartCandles} decimals={decimals} height={240} />
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
