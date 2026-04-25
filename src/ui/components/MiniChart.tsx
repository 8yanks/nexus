import { useMemo } from 'react'
import { colors } from '@/ui/theme'
import { isValidNumber } from '@/utils/math'

// ─── MINICHART — inline SVG sparkline ───────────────────────
//
// A 80×30 (default) sparkline used in dashboard / watchlist tables to
// show the recent close trend at a glance. Previously implemented with
// `recharts` (LineChart + ResponsiveContainer), which dragged in a 290 KB
// CartesianChart chunk just to draw a 30-pixel line per row.
//
// We swapped to a pure inline SVG path. Reasoning:
// - Sparklines don't need axes, tooltips, or a layout engine — recharts'
//   strengths are wasted at this scale.
// - lightweight-charts (the engine we use for the big TradingView chart)
//   would create a WebGL context per instance — fine for one big chart,
//   catastrophic for a watchlist with 20+ rows.
// - SVG paths render in JSDom, so tests can assert real geometry.
//
// Behaviour preserved from the recharts version:
// - <2 valid samples → em-dash empty state
// - NaN / Infinity filtered out before measuring
// - Default width 80, height 30
// - Auto-coloured green if last ≥ first, red otherwise; `color` prop wins

interface Props {
  data: number[]
  width?: number
  height?: number
  color?: string
  /** Stroke width in px. Default 1.5 — thin enough to fit in a table row. */
  strokeWidth?: number
}

export const MiniChart = ({
  data,
  width = 80,
  height = 30,
  color,
  strokeWidth = 1.5,
}: Props) => {
  // Memo block first — hooks must run unconditionally on every render.
  // Filter NaN/Infinity, then bake the SVG path. Both depend on `data`
  // (or its derived form), so we recompute only when the inputs move.
  const clean = useMemo(() => data.filter(isValidNumber), [data])
  // 1px inset so the stroke at min/max samples isn't clipped by the viewBox edge.
  const path = useMemo(
    () => buildSparklinePath(clean, width, height, 1),
    [clean, width, height],
  )

  if (clean.length < 2) {
    return <span style={{ color: colors.textDim, fontSize: 10 }}>—</span>
  }

  const first = clean[0]
  const last = clean[clean.length - 1]
  const lineColor = color ?? (last >= first ? colors.green : colors.red)

  return (
    <div style={{ width, height, display: 'inline-block' }} data-testid="minichart">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Recent price trend"
        style={{ display: 'block' }}
      >
        <path
          d={path}
          fill="none"
          stroke={lineColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

// ─── PURE PATH BUILDER ──────────────────────────────────────
// Exported so the unit tests can pin the geometry contract without
// going through React rendering. Contract:
// - returns an SVG path "M x0 y0 L x1 y1 L x2 y2 ..." string
// - x is evenly spaced inside the inset; y is min→bottom, max→top
// - flat input (min === max) draws a horizontal mid-line
// - <2 samples returns "" (caller guards via the em-dash branch)
//
// Mixing a non-component export with a component export trips
// react-refresh/only-export-components, but the helper-with-tests
// pattern is a deliberate trade-off here — extracting to its own file
// would obscure the colocation with the consumer.
// eslint-disable-next-line react-refresh/only-export-components
export const buildSparklinePath = (
  values: number[],
  width: number,
  height: number,
  inset = 0,
): string => {
  if (values.length < 2) return ''

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min
  const innerW = Math.max(0, width - inset * 2)
  const innerH = Math.max(0, height - inset * 2)
  const stepX = innerW / (values.length - 1)

  const pts = values.map((v, i) => {
    const x = inset + i * stepX
    // Flat series → centre the line vertically rather than divide by zero.
    const yNorm = range === 0 ? 0.5 : (v - min) / range
    // SVG y-axis grows DOWN; we want max at top, min at bottom.
    const y = inset + (1 - yNorm) * innerH
    return `${x.toFixed(2)} ${y.toFixed(2)}`
  })
  return `M ${pts[0]} L ${pts.slice(1).join(' L ')}`
}
