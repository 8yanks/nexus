import { colors, fonts } from '@/ui/theme'
import type { PerformancePoint } from '@/analytics/performance'

// ─── PERFORMANCE STRIP ──────────────────────────────────────
// TradingView-style horizontal row of "% change over N" cells.
// Each cell is colour-coded (green/red/neutral) and falls back to
// an em-dash when the window exceeds the available candle history.
// Stays compact so it can live in the ScreenHeader actions slot or
// above the chart on Detail without stealing much vertical space.

const fmtPct = (v: number | null): string => {
  if (v == null || !Number.isFinite(v)) return '—'
  const pct = v * 100
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
}

const colorFor = (v: number | null): string => {
  if (v == null || !Number.isFinite(v)) return colors.textDim
  if (v > 0) return colors.green
  if (v < 0) return colors.red
  return colors.textMuted
}

interface Props {
  points: PerformancePoint[]
  /** Compact mode squeezes the cells — used when space is tight. */
  compact?: boolean
}

export const PerformanceStrip = ({ points, compact = false }: Props) => {
  return (
    <div
      role="group"
      aria-label="Performance"
      style={{
        display: 'flex',
        gap: compact ? 4 : 6,
        alignItems: 'stretch',
      }}
    >
      {points.map((p) => (
        <div
          key={p.label}
          title={
            p.changePct != null
              ? `${p.label} (${p.barsBack} bars back): ${fmtPct(p.changePct)}`
              : `${p.label}: not enough history (needs ${p.barsBack} bars)`
          }
          style={{
            flex: 1,
            minWidth: compact ? 52 : 64,
            padding: compact ? '4px 6px' : '6px 10px',
            borderRadius: 4,
            background: colors.bgCardAlt,
            border: `1px solid ${colors.border}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: colors.textMuted,
              letterSpacing: '0.06em',
              fontFamily: fonts.mono,
            }}
          >
            {p.label}
          </div>
          <div
            style={{
              fontSize: compact ? 11 : 12,
              fontWeight: 700,
              fontFamily: fonts.mono,
              color: colorFor(p.changePct),
              marginTop: 2,
            }}
          >
            {fmtPct(p.changePct)}
          </div>
        </div>
      ))}
    </div>
  )
}
