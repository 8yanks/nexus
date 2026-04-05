import type { OHLCV, CandleSeries } from '@/types'
import type { AnalyticsResult } from '@/analytics/indicators'
import { computeAnalytics } from '@/analytics/indicators'
import { detectStructure } from '@/analytics/structure'
import { detectSignals } from '@/signals/detector'
import { safeDivide } from '@/utils/math'
import { computeStats } from './stats'

import type {
  BacktestConfig,
  BacktestTrade,
  BacktestEvent,
  EquityPoint,
  BacktestResult,
  TradeDirection,
  TradeExitReason,
} from './types'

// ─── INTERNAL POSITION STATE ────────────────────────────────

interface OpenPosition {
  direction: TradeDirection
  entryIndex: number
  entryPrice: number
  entryTimestamp: string
  entrySignal: BacktestTrade['entrySignal']
  highWaterMark: number    // for trailing stop
  lowWaterMark: number     // for short trailing stop
  barsHeld: number
}

// ─── HELPERS ────────────────────────────────────────────────

/** Build a synthetic CandleSeries from a slice of candles for analytics */
const sliceSeries = (
  candles: OHLCV[],
  end: number,
  instrumentId: string,
): CandleSeries => ({
  instrumentId,
  timeframe: '1h',
  candles: candles.slice(0, end + 1),
  _source: 'backtest',
  _status: 'SIMULATED',
  _provenance: { source: 'backtest', fetchMethod: 'replay', latencyMs: 0, timestamp: new Date().toISOString(), receivedAt: new Date().toISOString() },
  generatedAt: candles[end]?.timestamp ?? new Date().toISOString(),
})

// ─── ENGINE ─────────────────────────────────────────────────
// Event-driven backtest: iterates candle by candle, computes
// analytics at each step, detects signals, manages positions.

export const runBacktest = (
  series: CandleSeries,
  config: BacktestConfig,
): BacktestResult => {
  const candles = series.candles
  const trades: BacktestTrade[] = []
  const events: BacktestEvent[] = []
  const equity: EquityPoint[] = []

  let capital = config.initialCapital
  let peakEquity = capital
  let tradeId = 0
  let position: OpenPosition | null = null
  let prevAnalytics: AnalyticsResult | null = null

  // We need at least 30 candles for analytics to produce results
  const startBar = Math.max(30, 1)

  for (let i = startBar; i < candles.length; i++) {
    const candle = candles[i]
    const price = candle.close

    // 1. Compute analytics on data up to this bar
    const synthSeries = sliceSeries(candles, i, config.instrumentId)
    const analytics = computeAnalytics(synthSeries)
    const structure = detectStructure(candles.slice(0, i + 1))

    // 2. Check exit conditions BEFORE processing new signals
    if (position) {
      position.barsHeld++

      // Update water marks
      if (position.direction === 'long') {
        position.highWaterMark = Math.max(position.highWaterMark, candle.high)
      } else {
        position.lowWaterMark = Math.min(position.lowWaterMark, candle.low)
      }

      const exitResult = checkExit(position, candle, config, i)
      if (exitResult) {
        const trade = closeTrade(position, exitResult.price, exitResult.reason, candle.timestamp, i, candles, config)
        trades.push({ ...trade, id: ++tradeId })
        capital += trade.pnl - trade.commission
        events.push({
          index: i,
          timestamp: candle.timestamp,
          type: exitResult.reason === 'stop_loss' ? 'stop_hit' : exitResult.reason === 'take_profit' ? 'tp_hit' : 'exit',
          price: exitResult.price,
          detail: `Exit ${position.direction} @ ${exitResult.price.toFixed(2)} — ${exitResult.reason}`,
        })
        position = null
      }
    }

    // 3. Detect signals on this bar
    if (analytics) {
      const signals = detectSignals(
        config.instrumentId,
        price,
        analytics,
        structure,
        prevAnalytics,
      )

      for (const sig of signals) {
        events.push({
          index: i,
          timestamp: candle.timestamp,
          type: 'signal',
          price,
          detail: `${sig.type} (${sig.direction}, strength ${sig.strength.toFixed(2)})`,
        })

        // 4. Check entry conditions (only if no open position)
        if (
          !position &&
          config.entrySignals.includes(sig.type) &&
          sig.strength >= config.minStrength
        ) {
          const direction: TradeDirection =
            sig.direction === 'bearish' ? 'short' : 'long'

          position = {
            direction,
            entryIndex: i,
            entryPrice: price,
            entryTimestamp: candle.timestamp,
            entrySignal: sig.type,
            highWaterMark: candle.high,
            lowWaterMark: candle.low,
            barsHeld: 0,
          }

          events.push({
            index: i,
            timestamp: candle.timestamp,
            type: 'entry',
            price,
            detail: `Enter ${direction} @ ${price.toFixed(2)} on ${sig.type}`,
          })
        }

        // 5. Check opposite signal exit
        if (position && config.entrySignals.includes(sig.type)) {
          const isOpposite =
            (position.direction === 'long' && sig.direction === 'bearish') ||
            (position.direction === 'short' && sig.direction === 'bullish')

          if (isOpposite) {
            const trade = closeTrade(position, price, 'opposite_signal', candle.timestamp, i, candles, config)
            trades.push({ ...trade, id: ++tradeId })
            capital += trade.pnl - trade.commission
            events.push({
              index: i,
              timestamp: candle.timestamp,
              type: 'exit',
              price,
              detail: `Exit ${position.direction} @ ${price.toFixed(2)} — opposite signal (${sig.type})`,
            })
            position = null
          }
        }
      }

      prevAnalytics = analytics
    }

    // 6. Record equity
    const unrealized = position ? getUnrealizedPnl(position, price, config) : 0
    const currentEquity = capital + unrealized
    peakEquity = Math.max(peakEquity, currentEquity)
    const drawdown = peakEquity > 0 ? (peakEquity - currentEquity) / peakEquity : 0

    equity.push({
      index: i,
      timestamp: candle.timestamp,
      equity: currentEquity,
      drawdown,
    })
  }

  // Close any remaining position at last bar
  if (position && candles.length > 0) {
    const lastCandle = candles[candles.length - 1]
    const trade = closeTrade(
      position,
      lastCandle.close,
      'end_of_data',
      lastCandle.timestamp,
      candles.length - 1,
      candles,
      config,
    )
    trades.push({ ...trade, id: ++tradeId })
    capital += trade.pnl - trade.commission
    events.push({
      index: candles.length - 1,
      timestamp: lastCandle.timestamp,
      type: 'exit',
      price: lastCandle.close,
      detail: `Exit ${position.direction} @ ${lastCandle.close.toFixed(2)} — end of data`,
    })
  }

  // Final equity point
  if (equity.length > 0) {
    equity[equity.length - 1].equity = capital
  }

  const stats = computeStats(trades, equity, config)

  return {
    config,
    trades,
    events,
    equity,
    stats,
    startTimestamp: candles[startBar]?.timestamp ?? '',
    endTimestamp: candles[candles.length - 1]?.timestamp ?? '',
    candleCount: candles.length,
  }
}

// ─── EXIT CHECK ─────────────────────────────────────────────

const checkExit = (
  pos: OpenPosition,
  candle: OHLCV,
  config: BacktestConfig,
  _index: number,
): { price: number; reason: TradeExitReason } | null => {
  if (pos.direction === 'long') {
    // Stop-loss
    const slPrice = pos.entryPrice * (1 - config.stopLoss)
    if (candle.low <= slPrice) {
      return { price: slPrice, reason: 'stop_loss' }
    }

    // Take-profit
    const tpPrice = pos.entryPrice * (1 + config.takeProfit)
    if (candle.high >= tpPrice) {
      return { price: tpPrice, reason: 'take_profit' }
    }

    // Trailing stop
    if (config.trailingStop > 0) {
      const trailPrice = pos.highWaterMark * (1 - config.trailingStop)
      if (candle.low <= trailPrice && trailPrice > slPrice) {
        return { price: trailPrice, reason: 'trailing_stop' }
      }
    }
  } else {
    // Short stop-loss
    const slPrice = pos.entryPrice * (1 + config.stopLoss)
    if (candle.high >= slPrice) {
      return { price: slPrice, reason: 'stop_loss' }
    }

    // Short take-profit
    const tpPrice = pos.entryPrice * (1 - config.takeProfit)
    if (candle.low <= tpPrice) {
      return { price: tpPrice, reason: 'take_profit' }
    }

    // Short trailing stop
    if (config.trailingStop > 0) {
      const trailPrice = pos.lowWaterMark * (1 + config.trailingStop)
      if (candle.high >= trailPrice && trailPrice < slPrice) {
        return { price: trailPrice, reason: 'trailing_stop' }
      }
    }
  }

  // Max bars
  if (config.maxBars > 0 && pos.barsHeld >= config.maxBars) {
    return { price: candle.close, reason: 'max_bars' }
  }

  return null
}

// ─── CLOSE TRADE ────────────────────────────────────────────

const closeTrade = (
  pos: OpenPosition,
  exitPrice: number,
  exitReason: TradeExitReason,
  exitTimestamp: string,
  exitIndex: number,
  candles: OHLCV[],
  config: BacktestConfig,
): Omit<BacktestTrade, 'id'> => {
  const positionValue = config.initialCapital * config.positionSize
  const qty = safeDivide(positionValue, pos.entryPrice, 0)
  const commission = positionValue * config.commission * 2 // entry + exit

  let pnl: number
  if (pos.direction === 'long') {
    pnl = (exitPrice - pos.entryPrice) * qty
  } else {
    pnl = (pos.entryPrice - exitPrice) * qty
  }

  const pnlPct = safeDivide(pnl, positionValue, 0)

  // Compute MFE/MAE from candle data between entry and exit
  let maxFavorable = 0
  let maxAdverse = 0
  for (let j = pos.entryIndex; j <= exitIndex; j++) {
    const c = candles[j]
    if (pos.direction === 'long') {
      maxFavorable = Math.max(maxFavorable, safeDivide(c.high - pos.entryPrice, pos.entryPrice, 0))
      maxAdverse = Math.max(maxAdverse, safeDivide(pos.entryPrice - c.low, pos.entryPrice, 0))
    } else {
      maxFavorable = Math.max(maxFavorable, safeDivide(pos.entryPrice - c.low, pos.entryPrice, 0))
      maxAdverse = Math.max(maxAdverse, safeDivide(c.high - pos.entryPrice, pos.entryPrice, 0))
    }
  }

  return {
    direction: pos.direction,
    entryIndex: pos.entryIndex,
    entryPrice: pos.entryPrice,
    entryTimestamp: pos.entryTimestamp,
    entrySignal: pos.entrySignal,
    exitIndex,
    exitPrice,
    exitTimestamp,
    exitReason,
    pnl,
    pnlPct,
    commission,
    bars: exitIndex - pos.entryIndex,
    maxFavorable,
    maxAdverse,
  }
}

// ─── UNREALIZED P&L ─────────────────────────────────────────

const getUnrealizedPnl = (
  pos: OpenPosition,
  currentPrice: number,
  config: BacktestConfig,
): number => {
  const positionValue = config.initialCapital * config.positionSize
  const qty = safeDivide(positionValue, pos.entryPrice, 0)

  if (pos.direction === 'long') {
    return (currentPrice - pos.entryPrice) * qty
  }
  return (pos.entryPrice - currentPrice) * qty
}
