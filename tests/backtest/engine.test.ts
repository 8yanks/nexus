import { describe, it, expect } from 'vitest'
import { runBacktest } from '@/backtest/engine'
import { computeStats } from '@/backtest/stats'
import type { BacktestConfig, BacktestTrade, EquityPoint } from '@/backtest/types'
import { DEFAULT_CONFIG } from '@/backtest/types'
import type { OHLCV, CandleSeries } from '@/types'

// ─── HELPERS ────────────────────────────────────────────────

const mkCandle = (
  close: number,
  high?: number,
  low?: number,
  volume = 1000,
  timestamp?: string,
): OHLCV => ({
  open: close,
  high: high ?? close * 1.005,
  low: low ?? close * 0.995,
  close,
  volume,
  timestamp: timestamp ?? new Date().toISOString(),
  _source: 'test',
  _status: 'SIMULATED',
})

/** Build a trending series: starts at `start`, moves by `step` each bar */
const buildTrend = (
  start: number,
  step: number,
  count: number,
): OHLCV[] => {
  const candles: OHLCV[] = []
  const baseTime = Date.now() - count * 3600000
  for (let i = 0; i < count; i++) {
    const price = start + step * i
    candles.push(mkCandle(
      price,
      price + Math.abs(step) * 2,
      price - Math.abs(step) * 2,
      1000 + Math.random() * 500,
      new Date(baseTime + i * 3600000).toISOString(),
    ))
  }
  return candles
}

/** Build a sine-wave series for oscillating signals */
const buildSineWave = (
  base: number,
  amplitude: number,
  period: number,
  count: number,
): OHLCV[] => {
  const candles: OHLCV[] = []
  const baseTime = Date.now() - count * 3600000
  for (let i = 0; i < count; i++) {
    const price = base + amplitude * Math.sin((2 * Math.PI * i) / period)
    candles.push(mkCandle(
      price,
      price + amplitude * 0.15,
      price - amplitude * 0.15,
      800 + 400 * Math.abs(Math.sin((2 * Math.PI * i) / period)),
      new Date(baseTime + i * 3600000).toISOString(),
    ))
  }
  return candles
}

const wrapSeries = (candles: OHLCV[], instrumentId = 'test-inst'): CandleSeries => ({
  instrumentId,
  timeframe: '1h',
  candles,
  _source: 'test',
  _status: 'SIMULATED',
  _provenance: { source: 'test', fetchMethod: 'mock', latencyMs: 0 },
  generatedAt: new Date().toISOString(),
})

const testConfig = (overrides?: Partial<BacktestConfig>): BacktestConfig => ({
  ...DEFAULT_CONFIG,
  instrumentId: 'test-inst',
  initialCapital: 10000,
  positionSize: 0.1,
  commission: 0,
  ...overrides,
})

// ─── ENGINE TESTS ───────────────────────────────────────────

describe('runBacktest', () => {
  it('returns empty result for insufficient data', () => {
    const candles = Array.from({ length: 10 }, (_, i) => mkCandle(100 + i))
    const series = wrapSeries(candles)
    const result = runBacktest(series, testConfig())

    expect(result.trades).toHaveLength(0)
    expect(result.stats.totalTrades).toBe(0)
    expect(result.stats.finalEquity).toBe(10000)
  })

  it('produces valid result structure', () => {
    const candles = buildSineWave(100, 20, 30, 120)
    const series = wrapSeries(candles)
    const result = runBacktest(series, testConfig())

    expect(result.config).toBeDefined()
    expect(result.equity.length).toBeGreaterThan(0)
    expect(result.events.length).toBeGreaterThan(0)
    expect(result.startTimestamp).toBeTruthy()
    expect(result.endTimestamp).toBeTruthy()
    expect(result.candleCount).toBe(120)
  })

  it('equity curve starts near initial capital', () => {
    const candles = buildSineWave(100, 15, 25, 100)
    const series = wrapSeries(candles)
    const result = runBacktest(series, testConfig())

    expect(result.equity.length).toBeGreaterThan(0)
    // First equity point should be close to initial capital
    const firstEquity = result.equity[0].equity
    expect(firstEquity).toBeGreaterThanOrEqual(9000)
    expect(firstEquity).toBeLessThanOrEqual(11000)
  })

  it('records events for signals, entries, and exits', () => {
    const candles = buildSineWave(100, 20, 30, 120)
    const series = wrapSeries(candles)
    const result = runBacktest(series, testConfig())

    const eventTypes = new Set(result.events.map((e) => e.type))
    // Should at least have signal events
    expect(eventTypes.has('signal')).toBe(true)
    // Every event has valid fields
    for (const evt of result.events) {
      expect(evt.index).toBeGreaterThanOrEqual(0)
      expect(evt.timestamp).toBeTruthy()
      expect(evt.price).toBeGreaterThan(0)
      expect(evt.detail).toBeTruthy()
    }
  })

  it('stop-loss exits trades at the right level', () => {
    // Uptrend then sharp drop — should trigger stop-loss on a long
    const candles: OHLCV[] = []
    const baseTime = Date.now() - 200 * 3600000

    // 40 bars of flat data so analytics can warm up
    for (let i = 0; i < 40; i++) {
      candles.push(mkCandle(100, 101, 99, 1000, new Date(baseTime + i * 3600000).toISOString()))
    }

    // 10 bars of rise (to trigger bullish signals)
    for (let i = 0; i < 10; i++) {
      const p = 100 + i * 2
      candles.push(mkCandle(p, p + 2, p - 1, 2000, new Date(baseTime + (40 + i) * 3600000).toISOString()))
    }

    // Sudden crash
    for (let i = 0; i < 20; i++) {
      const p = 120 - i * 5
      candles.push(mkCandle(
        Math.max(p, 20),
        Math.max(p + 2, 22),
        Math.max(p - 5, 15),
        3000,
        new Date(baseTime + (50 + i) * 3600000).toISOString(),
      ))
    }

    const series = wrapSeries(candles)
    const config = testConfig({ stopLoss: 0.02, takeProfit: 0.5, maxBars: 0 })
    const result = runBacktest(series, config)

    const stopExits = result.trades.filter((t) => t.exitReason === 'stop_loss')
    // Trades that were stopped out should have negative PnL or small PnL
    for (const t of stopExits) {
      expect(t.pnl).toBeLessThanOrEqual(0)
    }
  })

  it('max bars exit triggers after configured bars', () => {
    const candles = buildSineWave(100, 5, 50, 150)
    const series = wrapSeries(candles)
    const config = testConfig({
      maxBars: 10,
      stopLoss: 0.5,    // very wide so SL doesn't trigger first
      takeProfit: 0.5,   // very wide so TP doesn't trigger first
      entrySignals: ['RSI_OVERSOLD', 'RSI_OVERBOUGHT', 'STRUCT_BULL', 'STRUCT_BEAR'],
      minStrength: 0.1,
    })
    const result = runBacktest(series, config)

    const maxBarExits = result.trades.filter((t) => t.exitReason === 'max_bars')
    for (const t of maxBarExits) {
      expect(t.bars).toBeLessThanOrEqual(config.maxBars + 1) // +1 for timing
    }
  })

  it('no position open at end if all trades closed', () => {
    const candles = buildSineWave(100, 15, 25, 80)
    const series = wrapSeries(candles)
    const result = runBacktest(series, testConfig())

    // All trades should have exit info
    for (const trade of result.trades) {
      expect(trade.exitPrice).toBeGreaterThan(0)
      expect(trade.exitTimestamp).toBeTruthy()
      expect(trade.exitReason).toBeTruthy()
    }
  })

  it('commission reduces final equity', () => {
    const candles = buildSineWave(100, 15, 25, 120)
    const series = wrapSeries(candles)

    const noComm = runBacktest(series, testConfig({ commission: 0 }))
    const withComm = runBacktest(series, testConfig({ commission: 0.005 }))

    // With commission, final equity should be lower (if any trades happened)
    if (noComm.trades.length > 0) {
      expect(withComm.stats.finalEquity).toBeLessThanOrEqual(noComm.stats.finalEquity)
    }
  })

  it('trade PnL fields are consistent', () => {
    const candles = buildSineWave(100, 20, 30, 120)
    const series = wrapSeries(candles)
    const result = runBacktest(series, testConfig())

    for (const trade of result.trades) {
      // PnL sign matches direction and price movement
      if (trade.direction === 'long') {
        const expected = trade.exitPrice > trade.entryPrice
        if (expected) expect(trade.pnl).toBeGreaterThan(0)
        else expect(trade.pnl).toBeLessThanOrEqual(0)
      } else {
        const expected = trade.exitPrice < trade.entryPrice
        if (expected) expect(trade.pnl).toBeGreaterThan(0)
        else expect(trade.pnl).toBeLessThanOrEqual(0)
      }

      // Bars = exitIndex - entryIndex
      expect(trade.bars).toBe(trade.exitIndex - trade.entryIndex)
      // MFE/MAE are non-negative
      expect(trade.maxFavorable).toBeGreaterThanOrEqual(0)
      expect(trade.maxAdverse).toBeGreaterThanOrEqual(0)
    }
  })
})

// ─── STATS TESTS ────────────────────────────────────────────

describe('computeStats', () => {
  const config = testConfig()

  it('returns zeroed stats for empty trades', () => {
    const stats = computeStats([], [], config)
    expect(stats.totalTrades).toBe(0)
    expect(stats.winRate).toBe(0)
    expect(stats.netProfit).toBe(0)
    expect(stats.finalEquity).toBe(10000)
    expect(stats.totalReturn).toBe(0)
  })

  it('computes win rate correctly', () => {
    const trades: BacktestTrade[] = [
      { id: 1, direction: 'long', entryIndex: 0, entryPrice: 100, entryTimestamp: '', entrySignal: 'RSI_OVERSOLD', exitIndex: 5, exitPrice: 110, exitTimestamp: '', exitReason: 'take_profit', pnl: 100, pnlPct: 0.1, commission: 1, bars: 5, maxFavorable: 0.1, maxAdverse: 0.01 },
      { id: 2, direction: 'long', entryIndex: 10, entryPrice: 100, entryTimestamp: '', entrySignal: 'RSI_OVERSOLD', exitIndex: 15, exitPrice: 95, exitTimestamp: '', exitReason: 'stop_loss', pnl: -50, pnlPct: -0.05, commission: 1, bars: 5, maxFavorable: 0.02, maxAdverse: 0.05 },
      { id: 3, direction: 'long', entryIndex: 20, entryPrice: 100, entryTimestamp: '', entrySignal: 'EMA_CROSS_BULL', exitIndex: 25, exitPrice: 108, exitTimestamp: '', exitReason: 'take_profit', pnl: 80, pnlPct: 0.08, commission: 1, bars: 5, maxFavorable: 0.08, maxAdverse: 0.02 },
    ]

    const equity: EquityPoint[] = [
      { index: 0, timestamp: '', equity: 10000, drawdown: 0 },
      { index: 5, timestamp: '', equity: 10099, drawdown: 0 },
      { index: 15, timestamp: '', equity: 10048, drawdown: 0.005 },
      { index: 25, timestamp: '', equity: 10127, drawdown: 0 },
    ]

    const stats = computeStats(trades, equity, config)

    expect(stats.totalTrades).toBe(3)
    expect(stats.winningTrades).toBe(2)
    expect(stats.losingTrades).toBe(1)
    expect(stats.winRate).toBeCloseTo(2 / 3, 4)
    expect(stats.grossProfit).toBe(180)
    expect(stats.grossLoss).toBe(50)
    expect(stats.profitFactor).toBeCloseTo(180 / 50, 4)
  })

  it('handles all winners (profit factor infinity)', () => {
    const trades: BacktestTrade[] = [
      { id: 1, direction: 'long', entryIndex: 0, entryPrice: 100, entryTimestamp: '', entrySignal: 'RSI_OVERSOLD', exitIndex: 5, exitPrice: 110, exitTimestamp: '', exitReason: 'take_profit', pnl: 100, pnlPct: 0.1, commission: 0, bars: 5, maxFavorable: 0.1, maxAdverse: 0.01 },
    ]
    const equity: EquityPoint[] = [
      { index: 0, timestamp: '', equity: 10000, drawdown: 0 },
      { index: 5, timestamp: '', equity: 10100, drawdown: 0 },
    ]

    const stats = computeStats(trades, equity, config)
    expect(stats.profitFactor).toBe(Infinity)
    expect(stats.winRate).toBe(1)
  })

  it('computes max drawdown from equity curve', () => {
    const equity: EquityPoint[] = [
      { index: 0, timestamp: '', equity: 10000, drawdown: 0 },
      { index: 1, timestamp: '', equity: 10500, drawdown: 0 },      // peak
      { index: 2, timestamp: '', equity: 9500, drawdown: 0.0952 },  // 9.52% DD
      { index: 3, timestamp: '', equity: 10200, drawdown: 0.0286 },
      { index: 4, timestamp: '', equity: 10600, drawdown: 0 },
    ]

    const trades: BacktestTrade[] = [
      { id: 1, direction: 'long', entryIndex: 0, entryPrice: 100, entryTimestamp: '', entrySignal: 'RSI_OVERSOLD', exitIndex: 4, exitPrice: 106, exitTimestamp: '', exitReason: 'take_profit', pnl: 600, pnlPct: 0.06, commission: 0, bars: 4, maxFavorable: 0.06, maxAdverse: 0 },
    ]

    const stats = computeStats(trades, equity, config)
    // Max DD should be (10500 - 9500) / 10500 ≈ 0.0952
    expect(stats.maxDrawdown).toBeCloseTo(1000 / 10500, 3)
    expect(stats.maxDrawdownAmount).toBeCloseTo(1000, 0)
  })

  it('computes total return correctly', () => {
    const trades: BacktestTrade[] = [
      { id: 1, direction: 'long', entryIndex: 0, entryPrice: 100, entryTimestamp: '', entrySignal: 'RSI_OVERSOLD', exitIndex: 5, exitPrice: 110, exitTimestamp: '', exitReason: 'take_profit', pnl: 200, pnlPct: 0.1, commission: 10, bars: 5, maxFavorable: 0.1, maxAdverse: 0 },
    ]
    const equity: EquityPoint[] = [
      { index: 0, timestamp: '', equity: 10000, drawdown: 0 },
      { index: 5, timestamp: '', equity: 10190, drawdown: 0 },
    ]

    const stats = computeStats(trades, equity, config)
    // netProfit = 200 - 0 - 10 = 190
    expect(stats.netProfit).toBe(190)
    expect(stats.totalReturn).toBeCloseTo(190 / 10000, 4)
    expect(stats.finalEquity).toBe(10190)
  })
})
