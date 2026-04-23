import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
  type MouseEventParams,
  type CandlestickData,
  type HistogramData,
} from 'lightweight-charts'
import type { OHLCV } from '@/types'
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
}

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

export const TradingViewChart = ({ candles, decimals, height = 240 }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const [hover, setHover] = useState<HoverState | null>(null)

  const isAuto = height === 'auto'

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

    chartRef.current = chart
    candleSeriesRef.current = candleSeries
    volSeriesRef.current = volSeries

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
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      volSeriesRef.current = null
    }
    // height/decimals shouldn't recreate the chart constantly — chart
    // options can be applied without remounting. But for now those props
    // are effectively static per-screen, so a remount on change is fine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, decimals])

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
    } catch {
      // Defensive: chart might already be torn down by a parallel effect.
    }
  }, [candles])

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
