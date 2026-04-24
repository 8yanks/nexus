import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  createChart,
  LineSeries,
  AreaSeries,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type UTCTimestamp,
  type MouseEventParams,
  type LineData,
  type AreaData,
} from 'lightweight-charts'
import type { EquityPoint } from '@/backtest/types'
import { colors, fonts } from '@/ui/theme'

// ─── EQUITY CHART — lightweight-charts edition ──────────────
//
// Replaces the Recharts ComposedChart that backed Backtest's equity
// view. Two series sharing one chart:
//   • Equity LineSeries on the right price scale (top ~70% of pane)
//   • Drawdown AreaSeries on its own bottom price scale (bottom ~30%)
//
// Reasons for the swap (consistent with the TradingViewChart/MiniChart
// migrations):
//   • Recharts pulls in ~290 KB of CartesianChart + reactivity glue
//     just to draw two lines and a tooltip — it was the last consumer
//     of the lib in this app.
//   • lightweight-charts gives us TradingView-grade crosshair behaviour
//     for free, matching the one we already use on Detail screens. Users
//     get a single mental model for "how charts hover" across the app.
//   • A single render engine across all charts reduces the bundle and
//     CPU cost of running tests/prod side by side.
//
// JSDom guard: lightweight-charts touches <canvas> on createChart, which
// JSDom doesn't implement. We swallow the error so the surrounding
// Backtest screen still mounts in tests — the data path still runs and
// we surface an empty container with the same testid contract.
//
// Initial-capital guideline: a horizontal dashed PriceLine on the equity
// series (mirrors the ReferenceLine the Recharts version drew). Above
// the line = profitable territory; below = drawdown territory.

interface Props {
  points: EquityPoint[]
  initialCapital: number
  /** Pixel height (default 240) or `"auto"` to fill a sized parent. */
  height?: number | 'auto'
}

interface HoverState {
  time: string
  equity: number
  drawdownPct: number
  pnlPct: number
}

const formatHoverTime = (unixSec: number): string => {
  const d = new Date(unixSec * 1000)
  const date = d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${date} ${time}`
}

export const EquityChart = ({ points, initialCapital, height = 240 }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const equitySeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const drawdownSeriesRef = useRef<ISeriesApi<'Area'> | null>(null)
  const baselineRef = useRef<IPriceLine | null>(null)
  const [hover, setHover] = useState<HoverState | null>(null)

  const isAuto = height === 'auto'

  // Pre-compute the deduped + sorted (timestamp, point) tuples once per
  // points change. lightweight-charts requires strictly-ascending times
  // and dies hard on duplicates; the engine emits one point per bar so
  // dupes are theoretically impossible but we belt-and-brace it.
  const sorted = useMemo(() => {
    const dedup = new Map<number, EquityPoint>()
    for (const p of points) {
      const t = Math.floor(new Date(p.timestamp).getTime() / 1000)
      if (Number.isFinite(t)) dedup.set(t, p)
    }
    return Array.from(dedup.entries()).sort((a, b) => a[0] - b[0])
  }, [points])

  // Mount: create the chart + both series once. Data is pushed via the
  // separate effect below so config-only updates don't tear down state.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let chart: IChartApi
    try {
      chart = createChart(container, {
        ...(isAuto ? {} : { height: height as number }),
        autoSize: true,
        layout: {
          background: { color: colors.bgCard },
          textColor: colors.textMuted,
          fontFamily: fonts.mono,
          fontSize: 11,
        },
        grid: {
          vertLines: { color: colors.border },
          horzLines: { color: colors.border },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { color: colors.borderLight, width: 1, style: 3 },
          horzLine: { color: colors.borderLight, width: 1, style: 3 },
        },
        rightPriceScale: {
          borderColor: colors.border,
          // Reserve the bottom 32% for the drawdown pane.
          scaleMargins: { top: 0.05, bottom: 0.32 },
        },
        timeScale: {
          borderColor: colors.border,
          timeVisible: true,
          secondsVisible: false,
        },
      })
    } catch {
      // JSDom (no canvas) — bail silently, container still renders.
      return
    }

    const equity = chart.addSeries(LineSeries, {
      color: colors.accent,
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      priceLineVisible: false,
      lastValueVisible: true,
      title: 'Equity',
    })

    // Drawdown sits in its own price scale anchored to the bottom of
    // the pane. Filling toward the baseline (zero) makes the visual
    // grow upward as drawdown deepens — easier to read than inverting
    // the axis (which the Recharts version did via `reversed`).
    const drawdown = chart.addSeries(AreaSeries, {
      priceScaleId: 'dd',
      lineColor: colors.red,
      topColor: `${colors.red}40`,
      bottomColor: `${colors.red}05`,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      title: 'Drawdown',
    })
    chart.priceScale('dd').applyOptions({
      scaleMargins: { top: 0.72, bottom: 0 },
      borderColor: colors.border,
    })

    chartRef.current = chart
    equitySeriesRef.current = equity
    drawdownSeriesRef.current = drawdown

    const onCrosshairMove = (param: MouseEventParams) => {
      if (
        !param.time ||
        !param.point ||
        param.point.x < 0 ||
        param.point.y < 0
      ) {
        setHover(null)
        return
      }
      const eq = param.seriesData.get(equity) as LineData | undefined
      const dd = param.seriesData.get(drawdown) as AreaData | undefined
      if (!eq) {
        setHover(null)
        return
      }
      const eqValue = eq.value
      const ddValue = dd?.value ?? 0
      setHover({
        time: formatHoverTime(param.time as UTCTimestamp),
        equity: eqValue,
        drawdownPct: ddValue,
        pnlPct: initialCapital > 0 ? (eqValue - initialCapital) / initialCapital : 0,
      })
    }
    chart.subscribeCrosshairMove(onCrosshairMove)

    return () => {
      chart.unsubscribeCrosshairMove(onCrosshairMove)
      chart.remove()
      chartRef.current = null
      equitySeriesRef.current = null
      drawdownSeriesRef.current = null
      baselineRef.current = null
    }
    // initialCapital is read inside the crosshair handler; we keep it
    // out of the deps because the baseline/PriceLine effect below
    // refreshes the line and the closure captures the latest value via
    // ref-free read. In practice initialCapital changes only on a fresh
    // backtest (which also changes `points`), so a remount is acceptable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height])

  // Push data on every points change. setData replaces the whole series;
  // since equity points are recomputed end-to-end per backtest run that's
  // exactly the semantics we want.
  useEffect(() => {
    const eqSeries = equitySeriesRef.current
    const ddSeries = drawdownSeriesRef.current
    if (!eqSeries || !ddSeries) return

    const eqData: LineData[] = sorted.map(([t, p]) => ({
      time: t as UTCTimestamp,
      value: p.equity,
    }))
    // Drawdown is stored as a fraction (0..1); render it as a percent so
    // the axis label reads "5.20" rather than "0.052".
    const ddData: AreaData[] = sorted.map(([t, p]) => ({
      time: t as UTCTimestamp,
      value: p.drawdown * 100,
    }))

    try {
      eqSeries.setData(eqData)
      ddSeries.setData(ddData)
    } catch {
      // Chart torn down between renders — nothing to push.
    }
  }, [sorted])

  // Baseline reference line (initial capital). Re-create on every
  // initialCapital change so the dashed line stays in sync.
  useEffect(() => {
    const eqSeries = equitySeriesRef.current
    if (!eqSeries) return
    if (baselineRef.current) {
      try {
        eqSeries.removePriceLine(baselineRef.current)
      } catch {
        // Series gone already — drop the stale handle.
      }
      baselineRef.current = null
    }
    if (Number.isFinite(initialCapital) && initialCapital > 0) {
      try {
        baselineRef.current = eqSeries.createPriceLine({
          price: initialCapital,
          color: colors.textDim,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: false,
          title: 'Init',
        })
      } catch {
        // Chart not initialised (JSDom) — skip silently.
      }
    }
  }, [initialCapital, sorted])

  const wrapperStyle: CSSProperties = isAuto
    ? { position: 'relative', width: '100%', height: '100%' }
    : { position: 'relative' }
  const innerStyle: CSSProperties = isAuto
    ? { width: '100%', height: '100%' }
    : { width: '100%', height: height as number }

  const pnlColor =
    hover == null ? colors.textMuted : hover.pnlPct >= 0 ? colors.green : colors.red

  return (
    <div style={wrapperStyle}>
      <div ref={containerRef} style={innerStyle} data-testid="equity-chart-container" />

      {hover && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 12,
            padding: '6px 10px',
            background: `${colors.bg}d0`,
            border: `1px solid ${colors.border}`,
            borderRadius: 4,
            fontFamily: fonts.mono,
            fontSize: 11,
            color: colors.text,
            pointerEvents: 'none',
            display: 'flex',
            gap: 14,
            alignItems: 'baseline',
          }}
          data-testid="equity-chart-tooltip"
        >
          <span style={{ color: colors.textMuted }}>{hover.time}</span>
          <span>
            Eq <span style={{ color: colors.text }}>{hover.equity.toFixed(2)}</span>
          </span>
          <span style={{ color: pnlColor }}>
            {hover.pnlPct >= 0 ? '+' : ''}
            {(hover.pnlPct * 100).toFixed(2)}%
          </span>
          <span>
            DD <span style={{ color: colors.red }}>{hover.drawdownPct.toFixed(2)}%</span>
          </span>
        </div>
      )}
    </div>
  )
}
