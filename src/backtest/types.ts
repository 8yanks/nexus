import type { SignalType, SignalDirection } from '@/types'

// ─── BACKTEST CONFIGURATION ─────────────────────────────────

export type EntryRule = 'signal'    // enter on matching signal
export type ExitRule = 'stop_loss' | 'take_profit' | 'trailing_stop' | 'opposite_signal' | 'max_bars'

export interface BacktestConfig {
  instrumentId: string
  /** Which signal types trigger entries */
  entrySignals: SignalType[]
  /** Minimum signal strength to trigger an entry (0-1) */
  minStrength: number
  /** Stop-loss as a fraction of entry price (e.g. 0.02 = 2%) */
  stopLoss: number
  /** Take-profit as a fraction of entry price */
  takeProfit: number
  /** Trailing stop as a fraction from high-water mark (0 = disabled) */
  trailingStop: number
  /** Maximum bars to hold before forced exit (0 = unlimited) */
  maxBars: number
  /** Initial capital for the backtest */
  initialCapital: number
  /** Fraction of capital to risk per trade (0-1) */
  positionSize: number
  /** Commission per trade as a fraction (e.g. 0.001 = 0.1%) */
  commission: number
}

export const DEFAULT_CONFIG: BacktestConfig = {
  instrumentId: 'BTC-USD-SPOT',
  entrySignals: ['RSI_OVERSOLD', 'BB_BREAKOUT_UP', 'EMA_CROSS_BULL', 'STRUCT_BULL'],
  minStrength: 0.4,
  stopLoss: 0.02,
  takeProfit: 0.04,
  trailingStop: 0,
  maxBars: 50,
  initialCapital: 10000,
  positionSize: 0.1,
  commission: 0.001,
}

// ─── TRADE RECORDS ──────────────────────────────────────────

export type TradeDirection = 'long' | 'short'
export type TradeExitReason = ExitRule | 'end_of_data'

export interface BacktestTrade {
  id: number
  direction: TradeDirection
  entryIndex: number
  entryPrice: number
  entryTimestamp: string
  entrySignal: SignalType
  exitIndex: number
  exitPrice: number
  exitTimestamp: string
  exitReason: TradeExitReason
  pnl: number           // absolute P&L
  pnlPct: number        // percentage P&L
  commission: number     // total commission paid
  bars: number           // duration in bars
  maxFavorable: number   // max favorable excursion (%)
  maxAdverse: number     // max adverse excursion (%)
}

// ─── BACKTEST EVENTS (for the event log) ────────────────────

export type BacktestEventType = 'signal' | 'entry' | 'exit' | 'stop_hit' | 'tp_hit'

export interface BacktestEvent {
  index: number
  timestamp: string
  type: BacktestEventType
  price: number
  detail: string
}

// ─── EQUITY POINT ───────────────────────────────────────────

export interface EquityPoint {
  index: number
  timestamp: string
  equity: number
  drawdown: number       // current drawdown as fraction from peak
}

// ─── BACKTEST STATISTICS ────────────────────────────────────

export interface BacktestStats {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number              // 0-1
  grossProfit: number
  grossLoss: number
  netProfit: number
  profitFactor: number         // grossProfit / |grossLoss|, Infinity if no losses
  maxDrawdown: number          // worst peak-to-trough as fraction
  maxDrawdownAmount: number    // worst peak-to-trough in absolute terms
  sharpeRatio: number          // annualized (assumes ~8760 hourly bars/year)
  avgWin: number
  avgLoss: number
  avgBars: number              // average trade duration
  expectancy: number           // avg PnL per trade
  totalCommission: number
  finalEquity: number
  totalReturn: number          // (final - initial) / initial
}

// ─── FULL BACKTEST RESULT ───────────────────────────────────

export interface BacktestResult {
  config: BacktestConfig
  trades: BacktestTrade[]
  events: BacktestEvent[]
  equity: EquityPoint[]
  stats: BacktestStats
  startTimestamp: string
  endTimestamp: string
  candleCount: number
}
