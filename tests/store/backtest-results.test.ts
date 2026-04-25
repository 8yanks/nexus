import { describe, it, expect, beforeEach } from 'vitest'
import { useMarketStore } from '@/store/market'
import type { BacktestResult } from '@/backtest/types'

// ─── STORE — backtestResults / setBacktestResult / clearBacktestResult ─
// Validates the backtest-results slice that Detail.tsx reads to surface
// trade markers on the live chart for the currently-selected instrument.
//
// Storage is intentionally in-memory (no localStorage) — backtests are
// cheap to re-run and result objects can be MB-scale, which would blow
// past localStorage quota fast.

const makeResult = (instrumentId: string, tradeCount = 3): BacktestResult => ({
  config: {
    instrumentId,
    initialCapital: 10_000,
    riskPerTrade: 0.02,
    entrySignals: ['rsi_oversold'],
    exitRules: { takeProfitR: 2, stopLossR: 1, maxBars: 50 },
    slippage: 0,
    commission: 0.001,
  },
  trades: Array.from({ length: tradeCount }, (_, i) => ({
    id: i,
    direction: 'long',
    entryIndex: i * 10,
    entryPrice: 100,
    entryTimestamp: new Date(Date.UTC(2026, 3, 19, i)).toISOString(),
    entrySignal: 'rsi_oversold',
    exitIndex: i * 10 + 5,
    exitPrice: 110,
    exitTimestamp: new Date(Date.UTC(2026, 3, 19, i, 5)).toISOString(),
    exitReason: 'take_profit',
    pnl: 100,
    pnlPct: 0.1,
    commission: 0.2,
    bars: 5,
    maxFavorable: 0.12,
    maxAdverse: 0.01,
  })),
  events: [],
  equity: [],
  stats: {
    totalTrades: tradeCount,
    winningTrades: tradeCount,
    losingTrades: 0,
    winRate: 1,
    grossProfit: 100 * tradeCount,
    grossLoss: 0,
    netProfit: 100 * tradeCount,
    profitFactor: Infinity,
    maxDrawdown: 0,
    maxDrawdownAmount: 0,
    sharpeRatio: 1,
    avgWin: 100,
    avgLoss: 0,
    avgBars: 5,
    expectancy: 100,
    totalCommission: 0.2 * tradeCount,
    finalEquity: 10_000 + 100 * tradeCount,
    totalReturn: (100 * tradeCount) / 10_000,
  },
  startTimestamp: '2026-04-19T00:00:00Z',
  endTimestamp: '2026-04-19T23:00:00Z',
  candleCount: 200,
})

describe('useMarketStore — backtestResults', () => {
  beforeEach(() => {
    useMarketStore.setState({ backtestResults: {} })
  })

  it('starts empty', () => {
    expect(useMarketStore.getState().backtestResults).toEqual({})
  })

  it('setBacktestResult adds the result keyed by instrumentId', () => {
    const result = makeResult('BTC-USD-SPOT')
    useMarketStore.getState().setBacktestResult(result)
    expect(useMarketStore.getState().backtestResults['BTC-USD-SPOT']).toBe(result)
  })

  it('setBacktestResult replaces a prior result for the same instrument', () => {
    const first = makeResult('BTC-USD-SPOT', 3)
    const second = makeResult('BTC-USD-SPOT', 7)
    useMarketStore.getState().setBacktestResult(first)
    useMarketStore.getState().setBacktestResult(second)
    expect(useMarketStore.getState().backtestResults['BTC-USD-SPOT']).toBe(second)
    expect(useMarketStore.getState().backtestResults['BTC-USD-SPOT'].trades).toHaveLength(7)
  })

  it('setBacktestResult preserves results for other instruments', () => {
    const btc = makeResult('BTC-USD-SPOT')
    const eth = makeResult('ETH-USD-SPOT')
    useMarketStore.getState().setBacktestResult(btc)
    useMarketStore.getState().setBacktestResult(eth)
    const map = useMarketStore.getState().backtestResults
    expect(map['BTC-USD-SPOT']).toBe(btc)
    expect(map['ETH-USD-SPOT']).toBe(eth)
  })

  it('clearBacktestResult(id) removes only the specified instrument', () => {
    const btc = makeResult('BTC-USD-SPOT')
    const eth = makeResult('ETH-USD-SPOT')
    useMarketStore.getState().setBacktestResult(btc)
    useMarketStore.getState().setBacktestResult(eth)
    useMarketStore.getState().clearBacktestResult('BTC-USD-SPOT')
    const map = useMarketStore.getState().backtestResults
    expect(map['BTC-USD-SPOT']).toBeUndefined()
    expect(map['ETH-USD-SPOT']).toBe(eth)
  })

  it('clearBacktestResult() with no arg wipes the entire map', () => {
    useMarketStore.getState().setBacktestResult(makeResult('BTC-USD-SPOT'))
    useMarketStore.getState().setBacktestResult(makeResult('ETH-USD-SPOT'))
    useMarketStore.getState().clearBacktestResult()
    expect(useMarketStore.getState().backtestResults).toEqual({})
  })

  it('clearBacktestResult on an absent key is a no-op (not an error)', () => {
    const btc = makeResult('BTC-USD-SPOT')
    useMarketStore.getState().setBacktestResult(btc)
    useMarketStore.getState().clearBacktestResult('NEVER-RAN')
    expect(useMarketStore.getState().backtestResults['BTC-USD-SPOT']).toBe(btc)
  })
})
