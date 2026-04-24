import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  createChart,
  createSeriesMarkers,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
  type MouseEventParams,
  type CandlestickData,
  type HistogramData,
  type LineData,
  type WhitespaceData,
} from 'lightweight-charts'
import type { OHLCV, SignalEvent } from '@/types'
import { calcEMASeries, calcBollingerSeries } from '@/analytics/indicators'
import { colors, fonts } from '@/ui/theme'

// ─── TRADINGVIEW LIGHTWEIGHT CHART ──────────────────────────
// Replaces the Recharts ComposedChart on Detail screens. Uses
// TradingView's open-source `lightweight-charts` lib for a precise
// hover crosshair + OHLC+volume tooltip — what the user asked for.
//
// Why not Recharts here: Recharts tooltips snap to the nearest data
// point but don't show a fixed crosshair, and reading exact OHLC
// values for a specific candle is fiddly. lightweight-charts is the
// same engine TradingView themselves use for thumbnail charts; the
// crosshair + tooltip behaviour is precisely what people expect from
// a "pro chart".
//
// Notes:
// - JSDom doesn't implement <canvas>, so chart creation is wrapped
//   in try/catch — the component still mounts in tests, just without
//   a rendered chart. The surrounding screen tests remain valid.
// - Volume sits in the lower 25% of the pane via priceScale margins.
// - Cleanup is critical: chart.remove() releases the WebGL context.

interface Props {
  candles: OHLCV[]
  decimals: number
  /**
   * Either a fixed pixel height (default 240), or `"auto"` to fill the
   * parent container. "auto" requires the parent to set a deterministic
   * height — typically `flex: 1; min-height: 0; position: relative`.
   */
  height?: number | 'auto'
  /**
   * EMA line overlays. Default `[20, 50]` (fast + slow); pass `[]` to
   * disable. Periods larger than the candle window produce an empty
   * series (filtered by the series loader) rather than erroring.
   */
  emaPeriods?: number[]
  /**
   * Signal events to render as arrow markers on the candles. Bullish
   * → green arrow-up below the bar; bearish → red arrow-down above the
   * bar; neutral → grey circle on bar. The marker uses the signal's
   * type as text and is anchored to the candle whose timestamp matches
   * the signal's bar (rounded to second-precision). Pass `[]` (default)
   * to disable.
   */
  markers?: SignalEvent[]
  /**
   * Optional Bollinger Bands overlay config. `null` (default) hides the
   * overlay entirely; pass an object to show all three bands (upper,
   * middle, lower) as LineSeries on the candle price scale. Middle is
   * the SMA; upper/lower sit `stdDev` standard deviations away from it.
   * Typical config: `{ period: 20, stdDev: 2 }`.
   */
  bollinger?: { period: number; stdDev: number } | null
}

// Orange for the fast EMA, cyan for the slow — palette-aligned and
// distinguishable both from the candles (green/red) and from each
// other. Exposed via CSS-var-style lookups to stay theme-aware.
const EMA_COLORS: Record<number, string> = {
  20: colors.orange,
  50: colors.cyan,
  100: colors.purple,
  200: colors.accent,
}
const emaColorFor = (period: number): string =>
  EMA_COLORS[period] ?? colors.textSecondary

interface HoverState {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  changePct: number  // close vs prior close
}

const formatHoverTime = (unixSec: number): string => {
  const d = new Date(unixSec * 1000)
  const date = d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${date} ${time}`
}

export const TradingViewChart = ({
  candles,
  decimals,
  height = 240,
  emaPeriods = [20, 50],
  markers = [],
  bollinger = null,
}: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  // EMA line series keyed by period — one line per configured period.
  // Using a ref keeps the map stable across renders (we tear them down
  // in the mount effect's cleanup).
  const emaSeriesRef = useRef<Map<number, ISeriesApi<'Line'>>>(new Map())
  // Markers plugin handle — created in the mount effect, fed in the
  // dedicated markers effect below so signal updates don't tear the
  // chart down.
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null)
  // Bollinger bands — three line series (upper, middle, lower) created
  // together or not at all based on the `bollinger` prop's presence.
  const bbSeriesRef = useRef<{
    upper: ISeriesApi<'Line'>
    middle: ISeriesApi<'Line'>
    lower: ISeriesApi<'Line'>
  } | null>(null)
  const [hover, setHover] = useState<HoverState | null>(null)

  const isAuto = height === 'auto'
  // Memo-equivalent: JSON.stringify makes the periods array a stable
  // dep for the mount effect so new periods actually re-create lines.
  const emaKey = emaPeriods.join(',')
  // Same trick for Bollinger — any config change remounts the bands.
  // `null` config is encoded as the empty string so enable/disable flips
  // are picked up too.
  const bbKey = bollinger ? `${bollinger.period}:${bollinger.stdDev}` : ''

  // Mount/unmount: create the chart once. Data + resize are handled
  // in dedicated effects so we don't tear down the chart on every
  // candle update (60s cadence ≫ render cost).
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let chart: IChartApi
    try {
      // In auto mode we let the container dictate the size — autoSize
      // observes the parent and resizes the canvas accordingly.
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
          scaleMargins: { top: 0.05, bottom: 0.28 },
        },
        timeScale: {
          borderColor: colors.border,
          timeVisible: true,
          secondsVisible: false,
        },
      })
    } catch {
      // Canvas-less environments (JSDom in unit tests). Bail silently.
      return
    }

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: colors.green,
      downColor: colors.red,
      wickUpColor: colors.green,
      wickDownColor: colors.red,
      borderVisible: false,
      priceFormat: { type: 'price', precision: decimals, minMove: 1 / 10 ** decimals },
    })

    const volSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
      color: `${colors.accent}40`,
    })
    chart.priceScale('vol').applyOptions({
      scaleMargins: { top: 0.78, bottom: 0 },
    })

    // EMA line overlays — one series per configured period, colour-coded
    // from the palette. They share the candle's right price-scale so
    // visually they sit directly on top of the candle bodies.
    const emaMap = new Map<number, ISeriesApi<'Line'>>()
    for (const period of emaPeriods) {
      if (!Number.isInteger(period) || period <= 0) continue
      const line = chart.addSeries(LineSeries, {
        color: emaColorFor(period),
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        title: `EMA ${period}`,
        priceFormat: { type: 'price', precision: decimals, minMove: 1 / 10 ** decimals },
      })
      emaMap.set(period, line)
    }

    // Markers plugin lives outside the candle series itself in v5 — it's
    // a SeriesPrimitive attached via createSeriesMarkers. Created empty
    // here; the dedicated markers effect feeds it.
    const markersPlugin = createSeriesMarkers<Time>(candleSeries, [])

    // Bollinger Bands overlay — three LineSeries that share the candle
    // price scale. Middle is the SMA (solid), upper/lower are dashed so
    // they read as "envelope" rather than signal lines. Only created
    // when the caller opted in via the `bollinger` prop.
    let bbBundle: {
      upper: ISeriesApi<'Line'>
      middle: ISeriesApi<'Line'>
      lower: ISeriesApi<'Line'>
    } | null = null
    if (bollinger && Number.isInteger(bollinger.period) && bollinger.period > 0) {
      const bandOpts = {
        color: colors.purple,
        lineWidth: 1 as const,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        priceFormat: { type: 'price' as const, precision: decimals, minMove: 1 / 10 ** decimals },
      }
      const upper = chart.addSeries(LineSeries, {
        ...bandOpts,
        lineStyle: LineStyle.Dashed,
        title: `BB${bollinger.period} upper`,
      })
      const middle = chart.addSeries(LineSeries, {
        ...bandOpts,
        lineStyle: LineStyle.Solid,
        title: `BB${bollinger.period} mid`,
      })
      const lower = chart.addSeries(LineSeries, {
        ...bandOpts,
        lineStyle: LineStyle.Dashed,
        title: `BB${bollinger.period} lower`,
      })
      bbBundle = { upper, middle, lower }
    }

    chartRef.current = chart
    candleSeriesRef.current = candleSeries
    volSeriesRef.current = volSeries
    emaSeriesRef.current = emaMap
    markersPluginRef.current = markersPlugin
    bbSeriesRef.current = bbBundle

    // Crosshair → tooltip overlay. We compute change vs prior close
    // here so the hover state mirrors what a TradingView pop-up shows.
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
      const candleData = param.seriesData.get(candleSeries) as CandlestickData | undefined
      const volData = param.seriesData.get(volSeries) as HistogramData | undefined
      if (!candleData) {
        setHover(null)
        return
      }

      // Prior close — find the candle just before this one in our local series.
      const ts = param.time as UTCTimestamp
      const idx = candles.findIndex((c) => Math.floor(new Date(c.timestamp).getTime() / 1000) === ts)
      const priorClose = idx > 0 ? candles[idx - 1].close : candleData.open
      const changePct = priorClose > 0 ? ((candleData.close - priorClose) / priorClose) * 100 : 0

      setHover({
        time: formatHoverTime(ts),
        open: candleData.open,
        high: candleData.high,
        low: candleData.low,
        close: candleData.close,
        volume: volData?.value ?? 0,
        changePct,
      })
    }

    chart.subscribeCrosshairMove(onCrosshairMove)

    return () => {
      chart.unsubscribeCrosshairMove(onCrosshairMove)
      // Detach markers plugin first — chart.remove() should clean it
      // up too but being explicit avoids dangling primitive references
      // in dev hot-reload.
      try {
        markersPlugin.detach()
      } catch {
        // Already detached — chart teardown got there first.
      }
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      volSeriesRef.current = null
      emaSeriesRef.current.clear()
      markersPluginRef.current = null
      bbSeriesRef.current = null
    }
    // height/decimals/emaKey/bbKey shouldn't recreate the chart constantly
    // — most chart options can be re-applied without remounting. But for
    // now those props are effectively static per-screen, so a remount on
    // change is fine. emaKey / bbKey changing does warrant a remount
    // (new line series to add/remove).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, decimals, emaKey, bbKey])

  // Push data on every candles change. setData is fast and idempotent;
  // it replaces the series rather than appending, which is what we want
  // because refreshAll rebuilds the candle window from scratch.
  //
  // lightweight-charts requires strictly-ascending timestamps. Real-world
  // WS streams can briefly emit duplicates (last partial candle replayed
  // alongside a fresh REST seed), so we dedupe by timestamp keeping the
  // newest occurrence and sort defensively before pushing.
  useEffect(() => {
    const candleSeries = candleSeriesRef.current
    const volSeries = volSeriesRef.current
    if (!candleSeries || !volSeries) return

    const dedup = new Map<number, OHLCV>()
    for (const c of candles) {
      const t = Math.floor(new Date(c.timestamp).getTime() / 1000)
      if (Number.isFinite(t)) dedup.set(t, c)
    }
    const sorted = Array.from(dedup.entries()).sort((a, b) => a[0] - b[0])

    const candleData: CandlestickData[] = sorted.map(([t, c]) => ({
      time: t as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }))

    const volData: HistogramData[] = sorted.map(([t, c]) => ({
      time: t as UTCTimestamp,
      value: c.volume,
      color: c.close >= c.open ? `${colors.green}40` : `${colors.red}40`,
    }))

    try {
      candleSeries.setData(candleData)
      volSeries.setData(volData)

      // EMA overlays — compute once per period from the deduped close
      // series, then feed each LineSeries. Positions without enough
      // history render as Whitespace (gap) so the line starts exactly
      // at the seed bar rather than leaving a flat 0 at the origin.
      const closes = sorted.map(([, c]) => c.close)
      for (const [period, series] of emaSeriesRef.current.entries()) {
        const ema = calcEMASeries(closes, period)
        const lineData: Array<LineData | WhitespaceData> = sorted.map(([t], i) => {
          const v = ema[i]
          return v == null
            ? { time: t as UTCTimestamp }
            : { time: t as UTCTimestamp, value: v }
        })
        series.setData(lineData)
      }

      // Bollinger Bands overlay — same Whitespace pattern so the bands
      // start exactly at `period - 1` rather than pinning to 0. We only
      // push if the caller opted in AND the three series got created.
      const bb = bbSeriesRef.current
      if (bb && bollinger) {
        const series = calcBollingerSeries(closes, bollinger.period, bollinger.stdDev)
        const upperData: Array<LineData | WhitespaceData> = []
        const middleData: Array<LineData | WhitespaceData> = []
        const lowerData: Array<LineData | WhitespaceData> = []
        for (let i = 0; i < sorted.length; i++) {
          const t = sorted[i][0] as UTCTimestamp
          const b = series[i]
          if (b == null) {
            upperData.push({ time: t })
            middleData.push({ time: t })
            lowerData.push({ time: t })
          } else {
            upperData.push({ time: t, value: b.upper })
            middleData.push({ time: t, value: b.middle })
            lowerData.push({ time: t, value: b.lower })
          }
        }
        bb.upper.setData(upperData)
        bb.middle.setData(middleData)
        bb.lower.setData(lowerData)
      }
    } catch {
      // Defensive: chart might already be torn down by a parallel effect.
    }
    // bollinger is read inside the effect but its config also triggers a
    // chart remount via bbKey — after that remount this effect re-runs
    // because candles is a stable reference at that point. bbKey change
    // alone is enough to pick up period/stdDev tweaks; we list it so
    // exhaustive-deps stays honest without over-rendering.
  }, [candles, bbKey])

  // Signal markers — colour-coded arrows pinned to the bar whose
  // timestamp matches each signal. Bullish → green arrow-up below the
  // bar; bearish → red arrow-down above; neutral → grey circle in-bar.
  // We dedupe by `${time}-${type}` so a duplicate signal in the array
  // (rare, but possible across providers) doesn't double-stamp the bar.
  useEffect(() => {
    const plugin = markersPluginRef.current
    if (!plugin) return
    if (markers.length === 0) {
      try {
        plugin.setMarkers([])
      } catch {
        // Plugin torn down — no-op.
      }
      return
    }
    const seen = new Set<string>()
    const out: SeriesMarker<Time>[] = []
    for (const sig of markers) {
      const t = Math.floor(new Date(sig.timestamp).getTime() / 1000)
      if (!Number.isFinite(t)) continue
      const key = `${t}-${sig.type}`
      if (seen.has(key)) continue
      seen.add(key)
      const isBull = sig.direction === 'bullish'
      const isBear = sig.direction === 'bearish'
      out.push({
        time: t as UTCTimestamp,
        position: isBull ? 'belowBar' : isBear ? 'aboveBar' : 'inBar',
        shape: isBull ? 'arrowUp' : isBear ? 'arrowDown' : 'circle',
        color: isBull ? colors.green : isBear ? colors.red : colors.textMuted,
        text: sig.type,
        size: 1,
      })
    }
    // setMarkers wants strictly-ascending time order (same constraint as
    // setData) — sort defensively before pushing. Times are seconds-since-
    // epoch numbers (we built them as UTCTimestamp), so a numeric cast is
    // safe; the SeriesMarker<Time> generic just makes TS pick the union.
    out.sort((a, b) => (a.time as number) - (b.time as number))
    try {
      plugin.setMarkers(out)
    } catch {
      // Plugin gone or chart torn down — no-op.
    }
  }, [markers])

  const isUp = hover != null && hover.changePct >= 0
  const changeColor = isUp ? colors.green : colors.red

  // In auto mode the wrapper fills its parent (which must be sized);
  // in fixed mode it falls back to the explicit pixel height. The
  // tooltip overlay is positioned absolutely against this wrapper.
  const wrapperStyle: CSSProperties = isAuto
    ? { position: 'relative', width: '100%', height: '100%' }
    : { position: 'relative' }
  const innerStyle: CSSProperties = isAuto
    ? { width: '100%', height: '100%' }
    : { width: '100%', height: height as number }

  return (
    <div style={wrapperStyle}>
      <div ref={containerRef} style={innerStyle} data-testid="tv-chart-container" />

      {/* EMA legend — bottom-left, only when overlays are active. Small
          colour-dots + period label so users know what the lines mean
          without hovering the chart. */}
      {emaPeriods.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            left: 12,
            display: 'flex',
            gap: 10,
            fontFamily: fonts.mono,
            fontSize: 10,
            color: colors.textMuted,
            pointerEvents: 'none',
            background: `${colors.bg}b0`,
            padding: '2px 6px',
            borderRadius: 3,
          }}
          data-testid="tv-chart-ema-legend"
        >
          {emaPeriods.map((p) => (
            <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 2,
                  background: emaColorFor(p),
                  borderRadius: 1,
                }}
              />
              EMA {p}
            </span>
          ))}
        </div>
      )}

      {/* Tooltip overlay — anchored top-left, mirrors TradingView's status row. */}
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
          data-testid="tv-chart-tooltip"
        >
          <span style={{ color: colors.textMuted }}>{hover.time}</span>
          <span>O <span style={{ color: colors.text }}>{hover.open.toFixed(decimals)}</span></span>
          <span>H <span style={{ color: colors.text }}>{hover.high.toFixed(decimals)}</span></span>
          <span>L <span style={{ color: colors.text }}>{hover.low.toFixed(decimals)}</span></span>
          <span>C <span style={{ color: changeColor }}>{hover.close.toFixed(decimals)}</span></span>
          <span style={{ color: changeColor }}>{hover.changePct >= 0 ? '+' : ''}{hover.changePct.toFixed(2)}%</span>
          <span style={{ color: colors.textMuted }}>Vol <span style={{ color: colors.text }}>{hover.volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
        </div>
      )}
    </div>
  )
}
