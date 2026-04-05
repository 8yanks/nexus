import { useState } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import { Play, RotateCcw } from 'lucide-react'
import { useMarketStore } from '@/store/market'
import { runBacktest } from '@/backtest/engine'
import { colors, fonts, card, statLabel, statValue, inputStyle as themeInputStyle } from '@/ui/theme'
import { fmt, fmtPct, fmtTime } from '@/utils/format'
import type { BacktestConfig, BacktestResult } from '@/backtest/types'
import { DEFAULT_CONFIG } from '@/backtest/types'
import type { SignalType } from '@/types'

// ─── ALL ENTRY SIGNAL OPTIONS ───────────────────────────────

const SIGNAL_OPTIONS: { value: SignalType; label: string }[] = [
  { value: 'RSI_OVERSOLD', label: 'RSI Oversold' },
  { value: 'RSI_OVERBOUGHT', label: 'RSI Overbought' },
  { value: 'BB_SQUEEZE', label: 'BB Squeeze' },
  { value: 'BB_BREAKOUT_UP', label: 'BB Breakout Up' },
  { value: 'BB_BREAKOUT_DOWN', label: 'BB Breakout Down' },
  { value: 'HIGH_VOLUME', label: 'High Volume' },
  { value: 'EMA_CROSS_BULL', label: 'EMA Cross Bull' },
  { value: 'EMA_CROSS_BEAR', label: 'EMA Cross Bear' },
  { value: 'STRUCT_BULL', label: 'Struct Bull' },
  { value: 'STRUCT_BEAR', label: 'Struct Bear' },
]

// ─── STAT DISPLAY ───────────────────────────────────────────

const Stat = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div style={{ marginBottom: 8 }}>
    <div style={statLabel}>{label}</div>
    <div style={{ ...statValue, fontSize: 13, color: color ?? colors.text }}>{value}</div>
  </div>
)

const ConfigPanel = ({
  config,
  setConfig,
  onRun,
  onReset,
  running,
}: {
  config: BacktestConfig
  setConfig: (c: BacktestConfig) => void
  onRun: () => void
  onReset: () => void
  running: boolean
}) => {
  const instruments = useMarketStore((s) => s.instruments)

  const toggleSignal = (sig: SignalType) => {
    const has = config.entrySignals.includes(sig)
    setConfig({
      ...config,
      entrySignals: has
        ? config.entrySignals.filter((s) => s !== sig)
        : [...config.entrySignals, sig],
    })
  }

  return (
    <div style={card}>
      <h3 style={{ margin: '0 0 12px', fontSize: 14, color: colors.text }}>Configuration</h3>

      {/* Instrument */}
      <div style={{ marginBottom: 10 }}>
        <div style={statLabel}>Instrument</div>
        <select
          value={config.instrumentId}
          onChange={(e) => setConfig({ ...config, instrumentId: e.target.value })}
          style={themeInputStyle}
        >
          {instruments.map((inst) => (
            <option key={inst.id} value={inst.id}>{inst.symbol}</option>
          ))}
        </select>
      </div>

      {/* Entry signals */}
      <div style={{ marginBottom: 10 }}>
        <div style={statLabel}>Entry Signals</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {SIGNAL_OPTIONS.map((opt) => {
            const active = config.entrySignals.includes(opt.value)
            return (
              <button
                key={opt.value}
                onClick={() => toggleSignal(opt.value)}
                style={{
                  padding: '3px 8px',
                  fontSize: 10,
                  border: `1px solid ${active ? colors.accent : colors.border}`,
                  borderRadius: 4,
                  background: active ? `${colors.accent}20` : 'transparent',
                  color: active ? colors.accent : colors.textMuted,
                  cursor: 'pointer',
                  fontFamily: fonts.mono,
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Numeric params — 2-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div>
          <div style={statLabel}>Stop Loss %</div>
          <input type="number" step="0.5" value={(config.stopLoss * 100).toFixed(1)}
            onChange={(e) => setConfig({ ...config, stopLoss: parseFloat(e.target.value) / 100 || 0 })}
            style={themeInputStyle}
          />
        </div>
        <div>
          <div style={statLabel}>Take Profit %</div>
          <input type="number" step="0.5" value={(config.takeProfit * 100).toFixed(1)}
            onChange={(e) => setConfig({ ...config, takeProfit: parseFloat(e.target.value) / 100 || 0 })}
            style={themeInputStyle}
          />
        </div>
        <div>
          <div style={statLabel}>Trailing Stop %</div>
          <input type="number" step="0.5" value={(config.trailingStop * 100).toFixed(1)}
            onChange={(e) => setConfig({ ...config, trailingStop: parseFloat(e.target.value) / 100 || 0 })}
            style={themeInputStyle}
          />
        </div>
        <div>
          <div style={statLabel}>Max Bars</div>
          <input type="number" step="5" value={config.maxBars}
            onChange={(e) => setConfig({ ...config, maxBars: parseInt(e.target.value) || 0 })}
            style={themeInputStyle}
          />
        </div>
        <div>
          <div style={statLabel}>Min Strength</div>
          <input type="number" step="0.1" min="0" max="1" value={config.minStrength}
            onChange={(e) => setConfig({ ...config, minStrength: parseFloat(e.target.value) || 0 })}
            style={themeInputStyle}
          />
        </div>
        <div>
          <div style={statLabel}>Position Size %</div>
          <input type="number" step="5" value={(config.positionSize * 100).toFixed(0)}
            onChange={(e) => setConfig({ ...config, positionSize: parseFloat(e.target.value) / 100 || 0.1 })}
            style={themeInputStyle}
          />
        </div>
        <div>
          <div style={statLabel}>Initial Capital</div>
          <input type="number" step="1000" value={config.initialCapital}
            onChange={(e) => setConfig({ ...config, initialCapital: parseFloat(e.target.value) || 10000 })}
            style={themeInputStyle}
          />
        </div>
        <div>
          <div style={statLabel}>Commission %</div>
          <input type="number" step="0.01" value={(config.commission * 100).toFixed(2)}
            onChange={(e) => setConfig({ ...config, commission: parseFloat(e.target.value) / 100 || 0 })}
            style={themeInputStyle}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onRun}
          disabled={running || config.entrySignals.length === 0}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '8px 16px',
            border: 'none',
            borderRadius: 6,
            cursor: running ? 'wait' : 'pointer',
            fontSize: 13,
            fontWeight: 600,
            color: '#fff',
            background: colors.accent,
            opacity: running || config.entrySignals.length === 0 ? 0.5 : 1,
          }}
        >
          <Play size={14} />
          {running ? 'Running...' : 'Run Backtest'}
        </button>
        <button
          onClick={onReset}
          style={{
            padding: '8px 12px',
            border: `1px solid ${colors.border}`,
            borderRadius: 6,
            cursor: 'pointer',
            background: 'transparent',
            color: colors.textMuted,
          }}
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── RESULTS PANEL ──────────────────────────────────────────

const ResultsPanel = ({ result }: { result: BacktestResult }) => {
  const { stats } = result
  const returnColor = stats.totalReturn >= 0 ? colors.green : colors.red

  return (
    <div style={card}>
      <h3 style={{ margin: '0 0 12px', fontSize: 14, color: colors.text }}>Results</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <Stat label="Net Profit" value={`$${fmt(stats.netProfit)}`} color={returnColor} />
        <Stat label="Total Return" value={fmtPct(stats.totalReturn)} color={returnColor} />
        <Stat label="Win Rate" value={`${(stats.winRate * 100).toFixed(1)}%`}
          color={stats.winRate >= 0.5 ? colors.green : colors.red} />
        <Stat label="Trades" value={`${stats.totalTrades}`} />
        <Stat label="Profit Factor" value={stats.profitFactor === Infinity ? '---' : stats.profitFactor.toFixed(2)}
          color={stats.profitFactor >= 1.5 ? colors.green : stats.profitFactor >= 1 ? colors.yellow : colors.red} />
        <Stat label="Max Drawdown" value={`${(stats.maxDrawdown * 100).toFixed(2)}%`}
          color={stats.maxDrawdown > 0.1 ? colors.red : colors.yellow} />
        <Stat label="Sharpe Ratio" value={stats.sharpeRatio.toFixed(2)}
          color={stats.sharpeRatio >= 1 ? colors.green : stats.sharpeRatio >= 0 ? colors.yellow : colors.red} />
        <Stat label="Avg Win" value={`$${fmt(stats.avgWin)}`} color={colors.green} />
        <Stat label="Avg Loss" value={`$${fmt(stats.avgLoss)}`} color={colors.red} />
        <Stat label="Expectancy" value={`$${fmt(stats.expectancy)}`}
          color={stats.expectancy >= 0 ? colors.green : colors.red} />
        <Stat label="Avg Duration" value={`${stats.avgBars.toFixed(1)} bars`} />
        <Stat label="Commission" value={`$${fmt(stats.totalCommission)}`} />
      </div>
    </div>
  )
}

// ─── EQUITY CHART ───────────────────────────────────────────

const EquityChart = ({ result }: { result: BacktestResult }) => {
  const data = result.equity.map((pt) => ({
    t: fmtTime(pt.timestamp),
    equity: parseFloat(pt.equity.toFixed(2)),
    drawdown: parseFloat((pt.drawdown * 100).toFixed(2)),
  }))

  return (
    <div style={card}>
      <h3 style={{ margin: '0 0 12px', fontSize: 14, color: colors.text }}>Equity Curve</h3>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data}>
          <CartesianGrid stroke={colors.border} strokeDasharray="3 3" />
          <XAxis dataKey="t" tick={{ fontSize: 10, fill: colors.textDim }} />
          <YAxis yAxisId="eq" tick={{ fontSize: 10, fill: colors.textDim }} />
          <YAxis yAxisId="dd" orientation="right" tick={{ fontSize: 10, fill: colors.textDim }} reversed />
          <Tooltip
            contentStyle={{ background: colors.bgCard, border: `1px solid ${colors.border}`, fontSize: 12 }}
            labelStyle={{ color: colors.textMuted }}
          />
          <ReferenceLine yAxisId="eq" y={result.config.initialCapital} stroke={colors.textDim} strokeDasharray="3 3" />
          <Area yAxisId="dd" type="monotone" dataKey="drawdown" fill={`${colors.red}20`} stroke="none" name="Drawdown %" />
          <Line yAxisId="eq" type="monotone" dataKey="equity" stroke={colors.accent} strokeWidth={1.5} dot={false} isAnimationActive={false} name="Equity" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── TRADE TABLE ────────────────────────────────────────────

const TradeTable = ({ result }: { result: BacktestResult }) => {
  const thStyle: React.CSSProperties = {
    padding: '6px 8px',
    textAlign: 'left',
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    borderBottom: `1px solid ${colors.border}`,
    fontWeight: 600,
  }

  const tdStyle: React.CSSProperties = {
    padding: '5px 8px',
    fontSize: 12,
    fontFamily: fonts.mono,
    borderBottom: `1px solid ${colors.border}`,
    color: colors.text,
  }

  return (
    <div style={card}>
      <h3 style={{ margin: '0 0 12px', fontSize: 14, color: colors.text }}>
        Trades ({result.trades.length})
      </h3>
      <div style={{ maxHeight: 300, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Dir</th>
              <th style={thStyle}>Signal</th>
              <th style={thStyle}>Entry</th>
              <th style={thStyle}>Exit</th>
              <th style={thStyle}>P&L</th>
              <th style={thStyle}>P&L %</th>
              <th style={thStyle}>Bars</th>
              <th style={thStyle}>Exit Reason</th>
            </tr>
          </thead>
          <tbody>
            {result.trades.map((t) => (
              <tr key={t.id} style={{ background: t.pnl >= 0 ? `${colors.green}08` : `${colors.red}08` }}>
                <td style={tdStyle}>{t.id}</td>
                <td style={{ ...tdStyle, color: t.direction === 'long' ? colors.green : colors.red }}>
                  {t.direction.toUpperCase()}
                </td>
                <td style={{ ...tdStyle, fontSize: 10 }}>{t.entrySignal}</td>
                <td style={tdStyle}>{fmt(t.entryPrice)}</td>
                <td style={tdStyle}>{fmt(t.exitPrice)}</td>
                <td style={{ ...tdStyle, color: t.pnl >= 0 ? colors.green : colors.red }}>
                  {t.pnl >= 0 ? '+' : ''}{fmt(t.pnl)}
                </td>
                <td style={{ ...tdStyle, color: t.pnl >= 0 ? colors.green : colors.red }}>
                  {fmtPct(t.pnlPct)}
                </td>
                <td style={tdStyle}>{t.bars}</td>
                <td style={{ ...tdStyle, fontSize: 10, color: colors.textMuted }}>
                  {t.exitReason.replace(/_/g, ' ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {result.trades.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: colors.textDim, fontSize: 12 }}>
            No trades generated
          </div>
        )}
      </div>
    </div>
  )
}

// ─── MAIN SCREEN ────────────────────────────────────────────

export const Backtest = () => {
  const candleMap = useMarketStore((s) => s.candles)
  const [config, setConfig] = useState<BacktestConfig>({ ...DEFAULT_CONFIG })
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [running, setRunning] = useState(false)

  const handleRun = () => {
    const series = candleMap[config.instrumentId]
    if (!series || series.candles.length < 30) return

    setRunning(true)
    // Use setTimeout to let the UI show "Running..."
    setTimeout(() => {
      const res = runBacktest(series, config)
      setResult(res)
      setRunning(false)
    }, 0)
  }

  const handleReset = () => {
    setConfig({ ...DEFAULT_CONFIG })
    setResult(null)
  }

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: colors.text }}>
        Backtest Engine
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        {/* Left: Config */}
        <ConfigPanel
          config={config}
          setConfig={setConfig}
          onRun={handleRun}
          onReset={handleReset}
          running={running}
        />

        {/* Right: Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {result ? (
            <>
              <ResultsPanel result={result} />
              <EquityChart result={result} />
              <TradeTable result={result} />
            </>
          ) : (
            <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
              <div style={{ textAlign: 'center', color: colors.textDim }}>
                <Play size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                <div style={{ fontSize: 14 }}>Configure and run a backtest</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  Select entry signals, set risk parameters, then click Run
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
