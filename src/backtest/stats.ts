import type { BacktestTrade, EquityPoint, BacktestConfig, BacktestStats } from './types'

// ─── COMPUTE STATS ──────────────────────────────────────────
// Pure function: takes trades + equity curve, returns stats.

export const computeStats = (
  trades: BacktestTrade[],
  equity: EquityPoint[],
  config: BacktestConfig,
): BacktestStats => {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      grossProfit: 0,
      grossLoss: 0,
      netProfit: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      maxDrawdownAmount: 0,
      sharpeRatio: 0,
      avgWin: 0,
      avgLoss: 0,
      avgBars: 0,
      expectancy: 0,
      totalCommission: 0,
      finalEquity: config.initialCapital,
      totalReturn: 0,
    }
  }

  const winners = trades.filter((t) => t.pnl > 0)
  const losers = trades.filter((t) => t.pnl <= 0)

  const grossProfit = winners.reduce((s, t) => s + t.pnl, 0)
  const grossLoss = Math.abs(losers.reduce((s, t) => s + t.pnl, 0))
  const totalCommission = trades.reduce((s, t) => s + t.commission, 0)
  const netProfit = grossProfit - grossLoss - totalCommission
  const finalEquity = config.initialCapital + netProfit

  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0

  const avgWin = winners.length > 0 ? grossProfit / winners.length : 0
  const avgLoss = losers.length > 0 ? grossLoss / losers.length : 0
  const avgBars = trades.reduce((s, t) => s + t.bars, 0) / trades.length
  const expectancy = netProfit / trades.length

  // Max drawdown from equity curve
  let maxDrawdown = 0
  let maxDrawdownAmount = 0
  let peak = config.initialCapital

  for (const pt of equity) {
    if (pt.equity > peak) peak = pt.equity
    const dd = peak - pt.equity
    const ddPct = peak > 0 ? dd / peak : 0
    if (ddPct > maxDrawdown) {
      maxDrawdown = ddPct
      maxDrawdownAmount = dd
    }
  }

  // Sharpe ratio: annualized from bar-to-bar returns
  const sharpeRatio = computeSharpe(equity)

  return {
    totalTrades: trades.length,
    winningTrades: winners.length,
    losingTrades: losers.length,
    winRate: winners.length / trades.length,
    grossProfit,
    grossLoss,
    netProfit,
    profitFactor,
    maxDrawdown,
    maxDrawdownAmount,
    sharpeRatio,
    avgWin,
    avgLoss,
    avgBars,
    expectancy,
    totalCommission,
    finalEquity,
    totalReturn: netProfit / config.initialCapital,
  }
}

// ─── SHARPE RATIO ───────────────────────────────────────────
// Annualized Sharpe assuming hourly bars (~8760 bars/year).

const computeSharpe = (equity: EquityPoint[]): number => {
  if (equity.length < 2) return 0

  const returns: number[] = []
  for (let i = 1; i < equity.length; i++) {
    if (equity[i - 1].equity > 0) {
      returns.push((equity[i].equity - equity[i - 1].equity) / equity[i - 1].equity)
    }
  }

  if (returns.length < 2) return 0

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1)
  const std = Math.sqrt(variance)

  if (std === 0) return 0

  // Annualize: sqrt(8760) for hourly bars
  const BARS_PER_YEAR = 8760
  return (mean / std) * Math.sqrt(BARS_PER_YEAR)
}
