import { useEffect, useMemo, useState } from 'react'
import { useMarketStore } from '@/store/market'
import { StatusBadge } from '@/ui/components/StatusBadge'
import { FreshnessDot } from '@/ui/components/FreshnessDot'
import { PriceChange } from '@/ui/components/PriceChange'
import { MiniChart } from '@/ui/components/MiniChart'
import { QualityBar } from '@/ui/components/QualityBar'
import { ScreenHeader } from '@/ui/components/ScreenHeader'
import { TradingViewChart } from '@/ui/components/TradingViewChart'
import { DragHandle } from '@/ui/components/DragHandle'
import { fmt, fmtVol, fmtAge } from '@/utils/format'
import { ASSET_CLASS_LABELS, ASSET_CLASS_COLORS } from '@/utils/format'
import { colors, fonts, radius, card, thStyle, tdStyle, monoTd, statValue, statLabel } from '@/ui/theme'
import { safeFixed } from '@/utils/math'

// ─── DASHBOARD — split-view per v3 design handoff ───────────
//
// Two columns under the ScreenHeader:
//
//   LEFT (48%)            RIGHT (flex 1)
//   ┌─────────────┐       ┌──────────────────────────┐
//   │ KPI strip   │       │ Instrument header        │
//   │             │       ├──────────────────────────┤
//   │ Watchlist   │       │ Candle chart             │
//   │  table      │       │   (flex: 1)              │
//   │             │       ├──────────────────────────┤  ← drag handle
//   │             │       │ Stats / signals / open   │
//   └─────────────┘       └──────────────────────────┘
//
// Single-click watchlist row → focusInstrument (right pane updates).
// Double-click → selectInstrument (navigate to Detail screen).
// The bottom panel is resizable; height persisted to localStorage.

const BOTTOM_H_KEY = 'nexus_focus_bottom_h'
const BOTTOM_H_DEFAULT = 180

const loadBottomH = (): number => {
  if (typeof window === 'undefined') return BOTTOM_H_DEFAULT
  try {
    const raw = window.localStorage.getItem(BOTTOM_H_KEY)
    if (!raw) return BOTTOM_H_DEFAULT
    const n = Number.parseInt(raw, 10)
    return Number.isFinite(n) ? n : BOTTOM_H_DEFAULT
  } catch {
    return BOTTOM_H_DEFAULT
  }
}
const saveBottomH = (n: number) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(BOTTOM_H_KEY, String(n))
  } catch {
    /* swallow */
  }
}

const KPI = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div style={{ ...card, padding: '10px 12px', flex: 1, minWidth: 110 }}>
    <div style={statLabel}>{label}</div>
    <div style={{ ...statValue, color: color ?? colors.text, fontSize: 16 }}>{value}</div>
  </div>
)

export const Dashboard = () => {
  const instruments = useMarketStore((s) => s.instruments)
  const snapshots = useMarketStore((s) => s.snapshots)
  const candles = useMarketStore((s) => s.candles)
  const quality = useMarketStore((s) => s.quality)
  const readiness = useMarketStore((s) => s.readiness)
  const lastRefresh = useMarketStore((s) => s.lastRefresh)
  const signals = useMarketStore((s) => s.signals)
  const selectedId = useMarketStore((s) => s.selectedInstrumentId)
  const selectInstrument = useMarketStore((s) => s.selectInstrument)
  const focusInstrument = useMarketStore((s) => s.focusInstrument)

  // Top-level KPIs
  const liveCount = Object.values(snapshots).filter((s) => s._status === 'LIVE').length
  const simCount = Object.values(snapshots).filter((s) => s._status === 'SIMULATED').length
  const totalSignals = signals.length

  // Signal count per instrument — used by the watchlist row badge.
  const signalCountById = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of signals) {
      map[s.instrumentId] = (map[s.instrumentId] ?? 0) + 1
    }
    return map
  }, [signals])

  // ── Right-pane focus ──
  // Falls back to the first instrument so the right pane never starts
  // blank — having an empty preview pane on a fresh dashboard reads as
  // "broken". The user can click any other row to refocus.
  const focusedId = selectedId ?? instruments[0]?.id ?? null
  const focused = focusedId ? instruments.find((i) => i.id === focusedId) ?? null : null
  const focusedSnap = focused ? snapshots[focused.id] : null
  const focusedCandles = focused ? candles[focused.id]?.candles ?? [] : []
  const focusedSignals = useMemo(
    () => (focused ? signals.filter((s) => s.instrumentId === focused.id).slice(0, 12) : []),
    [focused, signals],
  )

  // ── Bottom-panel resize ──
  const [bottomH, setBottomH] = useState<number>(() => loadBottomH())
  useEffect(() => {
    saveBottomH(bottomH)
  }, [bottomH])

  return (
    <>
      <ScreenHeader
        title="Market Dashboard"
        subtitle="Vue d'ensemble — instruments suivis, snapshots live/simulés, signaux actifs et qualité agrégée."
        badge={
          <span
            style={{
              padding: '2px 8px',
              borderRadius: radius.badge,
              background: colors.bgHover,
              border: `1px solid ${colors.border}`,
              fontSize: 10,
              fontFamily: fonts.mono,
              color: colors.textMuted,
              letterSpacing: '0.04em',
            }}
            data-testid="dashboard-refresh-badge"
          >
            {lastRefresh ? `updated ${fmtAge(lastRefresh)}` : 'initializing'}
          </span>
        }
        actions={
          readiness ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Bot Readiness
              </span>
              <QualityBar score={readiness.score} width={64} />
              <span
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 11,
                  fontWeight: 700,
                  color: readiness.ready ? colors.green : colors.red,
                }}
                data-testid="dashboard-readiness-label"
              >
                {readiness.ready ? 'READY' : 'NOT READY'}
              </span>
            </div>
          ) : undefined
        }
      />

      {/* Two-column split: left watchlist + right focus pane */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: '12px 16px',
          // The dashboard fills the remaining viewport so the right
          // pane's chart can stretch instead of being a fixed height.
          minHeight: 'calc(100vh - 44px - 22px - 60px)',
        }}
      >
        {/* ─── LEFT: KPIs + watchlist ─── */}
        <div
          style={{
            width: '48%',
            minWidth: 360,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            minHeight: 0,
          }}
        >
          {/* KPI strip — 4 condensed cards */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <KPI label="Instruments" value={`${instruments.length}`} />
            <KPI label="Live Feeds" value={`${liveCount}`} color={liveCount > 0 ? colors.green : colors.textDim} />
            <KPI label="Signals" value={`${totalSignals}`} color={totalSignals > 0 ? colors.yellow : colors.textDim} />
            <KPI label="Avg Quality" value={
              instruments.length > 0
                ? `${safeFixed(
                    (Object.values(quality).reduce((s, q) => s + (q?.overallScore ?? 0), 0) / instruments.length) * 100,
                    0,
                  )}%`
                : '—'
            } />
          </div>

          {/* Watchlist Table */}
          <div style={{ ...card, padding: 0, overflow: 'auto', flex: 1, minHeight: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: fonts.sans }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 22, padding: '10px 6px' }}></th>
                  <th style={thStyle}>Instrument</th>
                  <th style={thStyle}>Class</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Price</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>24h</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Trend</th>
                  <th style={{ ...thStyle, textAlign: 'center', width: 36 }}>Sig</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {instruments.map((inst, idx) => {
                  const snap = snapshots[inst.id]
                  const series = candles[inst.id]
                  const closes = series?.candles.slice(-30).map((c) => c.close) ?? []
                  const isForex = inst.assetClass === 'forex'
                  const isFocused = inst.id === focusedId
                  const sigN = signalCountById[inst.id] ?? 0
                  const baseBg = isFocused
                    ? colors.accentDim
                    : idx % 2 === 0
                      ? colors.bgTableRow
                      : colors.bgTableRowAlt

                  return (
                    <tr
                      key={inst.id}
                      data-testid={`watchlist-row-${inst.id}`}
                      data-focused={isFocused ? 'true' : 'false'}
                      // Single-click focuses in the right pane; double-click
                      // drills into the Detail screen. React fires onClick
                      // twice during a dblclick — focusing twice on the same
                      // instrument is a no-op so this is fine.
                      onClick={() => focusInstrument(inst.id)}
                      onDoubleClick={() => selectInstrument(inst.id)}
                      style={{
                        cursor: 'pointer',
                        background: baseBg,
                        borderLeft: isFocused
                          ? `2px solid ${colors.accent}`
                          : '2px solid transparent',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => {
                        if (!isFocused) e.currentTarget.style.background = colors.bgHover
                      }}
                      onMouseLeave={(e) => {
                        if (!isFocused) e.currentTarget.style.background = baseBg
                      }}
                    >
                      <td style={{ ...tdStyle, padding: '8px 6px', textAlign: 'center' }}>
                        <FreshnessDot timestamp={snap?._provenance.timestamp} />
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: colors.text, fontSize: 12 }}>{inst.symbol}</span>
                          <span style={{ fontSize: 10, color: colors.textDim, marginTop: 1 }}>{inst.exchange}</span>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          fontSize: 9,
                          fontWeight: 600,
                          color: ASSET_CLASS_COLORS[inst.assetClass],
                          background: `${ASSET_CLASS_COLORS[inst.assetClass]}15`,
                          padding: '2px 5px',
                          borderRadius: 3,
                          letterSpacing: '0.02em',
                        }}>
                          {ASSET_CLASS_LABELS[inst.assetClass]}
                        </span>
                      </td>
                      <td style={{ ...monoTd, textAlign: 'right', fontWeight: 600, fontSize: 12 }}>
                        {snap ? fmt(snap.price, isForex ? 5 : 2) : '—'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <PriceChange
                          change={snap?.change24h ?? null}
                          title="Rolling 24h change from source exchange. May differ from TradingView/Google daily windows."
                        />
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <MiniChart data={closes} />
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {sigN > 0 ? (
                          <span
                            style={{
                              display: 'inline-block',
                              minWidth: 18,
                              padding: '1px 5px',
                              borderRadius: radius.pill,
                              background: colors.yellowDim,
                              color: colors.yellow,
                              fontSize: 10,
                              fontFamily: fonts.mono,
                              fontWeight: 700,
                            }}
                          >
                            {sigN}
                          </span>
                        ) : (
                          <span style={{ color: colors.textDim, fontSize: 10 }}>·</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {snap ? <StatusBadge status={snap._status} /> : <span style={{ color: colors.textDim, fontSize: 10 }}>N/A</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Live/Sim summary footer — keeps the simulated count visible
              even though we dropped its KPI to 4 columns. */}
          {simCount > 0 && (
            <div
              style={{
                fontSize: 10,
                fontFamily: fonts.mono,
                color: colors.textMuted,
                letterSpacing: '0.04em',
                paddingLeft: 4,
              }}
            >
              {simCount} simulated feed{simCount === 1 ? '' : 's'} active
            </div>
          )}
        </div>

        {/* ─── RIGHT: focus pane ─── */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            ...card,
            padding: 0,
            overflow: 'hidden',
          }}
          data-testid="focus-pane"
        >
          {focused && focusedSnap ? (
            <>
              {/* Instrument header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderBottom: `1px solid ${colors.border}`,
                  flexShrink: 0,
                }}
              >
                <FreshnessDot timestamp={focusedSnap._provenance.timestamp} />
                <span style={{ fontWeight: 700, fontSize: 14, color: colors.text }}>
                  {focused.symbol}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: ASSET_CLASS_COLORS[focused.assetClass],
                    background: `${ASSET_CLASS_COLORS[focused.assetClass]}15`,
                    padding: '2px 6px',
                    borderRadius: 3,
                    letterSpacing: '0.02em',
                  }}
                >
                  {ASSET_CLASS_LABELS[focused.assetClass]}
                </span>
                <span style={{ fontSize: 11, color: colors.textMuted }}>
                  {focused.name} · {focused.exchange}
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span
                    style={{
                      fontFamily: fonts.mono,
                      fontWeight: 700,
                      fontSize: 22,
                      color: colors.text,
                    }}
                  >
                    {fmt(focusedSnap.price, focused.assetClass === 'forex' ? 5 : 2)}
                  </span>
                  <PriceChange change={focusedSnap.change24h ?? null} />
                  <StatusBadge status={focusedSnap._status} />
                </div>
              </div>

              {/* Chart — fills remaining space above the bottom panel.
                  Wrapper is sized by flex; TradingViewChart in `auto`
                  mode observes the parent and resizes accordingly. */}
              <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                <TradingViewChart
                  candles={focusedCandles.slice(-120)}
                  decimals={focused.assetClass === 'forex' ? 5 : 2}
                  height="auto"
                  markers={focusedSignals}
                />
              </div>

              <DragHandle
                value={bottomH}
                onResize={setBottomH}
                min={120}
                max={400}
                label="Resize stats panel"
              />

              {/* Bottom: stats strip + signals + open-detail */}
              <div
                style={{
                  height: bottomH,
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  background: colors.bgCardAlt,
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, 1fr)',
                    gap: 1,
                    background: colors.border,
                    flexShrink: 0,
                  }}
                >
                  <FocusStat label="Bid" value={fmt(focusedSnap.bid ?? null, focused.assetClass === 'forex' ? 5 : 2)} />
                  <FocusStat label="Ask" value={fmt(focusedSnap.ask ?? null, focused.assetClass === 'forex' ? 5 : 2)} />
                  <FocusStat label="24h High" value={fmt(focusedSnap.high24h ?? null, focused.assetClass === 'forex' ? 5 : 2)} />
                  <FocusStat label="24h Low" value={fmt(focusedSnap.low24h ?? null, focused.assetClass === 'forex' ? 5 : 2)} />
                  <FocusStat label="Volume" value={fmtVol(focusedSnap.volume24h ?? null)} />
                  <FocusStat label="Spread" value={`${safeFixed(focusedSnap.spreadBps ?? 0, 1)} bps`} />
                </div>

                {/* Signals list (scrollable) */}
                <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '6px 12px' }}>
                  {focusedSignals.length === 0 ? (
                    <div style={{ color: colors.textDim, fontSize: 11, padding: '8px 0' }}>
                      No active signals on {focused.symbol}.
                    </div>
                  ) : (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {focusedSignals.map((s) => (
                        <li
                          key={s.id}
                          style={{
                            display: 'flex',
                            gap: 10,
                            padding: '4px 0',
                            fontSize: 11,
                            fontFamily: fonts.mono,
                            color: colors.textSecondary,
                            borderBottom: `1px solid ${colors.border}`,
                          }}
                        >
                          <span style={{ color: colors.textDim, minWidth: 56 }}>{fmtAge(s.timestamp)}</span>
                          <span
                            style={{
                              color: s.direction === 'bullish'
                                ? colors.green
                                : s.direction === 'bearish'
                                  ? colors.red
                                  : colors.text,
                              fontWeight: 600,
                            }}
                          >
                            {s.type}
                          </span>
                          <span style={{ color: colors.textMuted }}>{s.description}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Open Full Detail → */}
                <button
                  type="button"
                  onClick={() => selectInstrument(focused.id)}
                  style={{
                    margin: '6px 12px 8px',
                    padding: '6px 10px',
                    background: 'transparent',
                    border: `1px solid ${colors.border}`,
                    borderRadius: radius.btn,
                    color: colors.accent,
                    fontFamily: fonts.sans,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    alignSelf: 'flex-start',
                  }}
                >
                  Open Full Detail →
                </button>
              </div>
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.textDim,
                fontSize: 12,
              }}
            >
              Select an instrument from the watchlist.
            </div>
          )}
        </div>
      </div>
    </>
  )
}

const FocusStat = ({ label, value }: { label: string; value: string }) => (
  <div
    style={{
      background: colors.bgCard,
      padding: '6px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
    }}
  >
    <span style={statLabel}>{label}</span>
    <span style={{ ...statValue, fontSize: 12 }}>{value}</span>
  </div>
)
