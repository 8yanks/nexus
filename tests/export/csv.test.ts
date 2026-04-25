import { describe, it, expect } from 'vitest'
import { snapshotsToCSV, tradesToCSV } from '@/export/csv'
import type { Instrument, MarketSnapshot } from '@/types'
import { DEFAULT_CONFIG, type BacktestResult, type BacktestTrade } from '@/backtest/types'

const mkInstrument = (id: string): Instrument => ({
  id,
  symbol: id,
  name: id,
  assetClass: 'crypto_spot',
  exchange: 'Test',
  baseCurrency: 'BTC',
  quoteCurrency: 'USD',
  contractType: 'spot',
  tickSize: 0.01,
  lotSize: 0.001,
  metadata: { listingDate: '2020-01-01', sector: null },
})

const mkSnap = (instrumentId: string, price: number): MarketSnapshot => ({
  instrumentId,
  price,
  bid: price - 5,
  ask: price + 5,
  spread: 10,
  spreadBps: 1.5,
  change24h: 100,
  change24hPct: 0.005,
  high24h: price + 500,
  low24h: price - 500,
  volume24h: 1_000_000,
  openInterest: null,
  fundingRate: null,
  nextFunding: null,
  liquidations24h: null,
  vwap: null,
  _source: 'test',
  _status: 'SIMULATED',
  _provenance: { source: 'test', fetchMethod: 'mock', latencyMs: 3, timestamp: new Date().toISOString(), receivedAt: new Date().toISOString() },
  _quality: { completeness: 1, timeliness: 0.9, accuracy: 1, consistency: 0.95 },
})

describe('CSV Export', () => {
  it('generates header row', () => {
    const csv = snapshotsToCSV([], {})
    const header = csv.split('\n')[0]
    expect(header).toContain('instrument_id')
    expect(header).toContain('price')
    expect(header).toContain('_status')
    expect(header).toContain('exported_at')
  })

  it('generates data rows for instruments with snapshots', () => {
    const instruments = [mkInstrument('BTC'), mkInstrument('ETH')]
    const snapshots = { BTC: mkSnap('BTC', 67000), ETH: mkSnap('ETH', 2000) }
    const csv = snapshotsToCSV(instruments, snapshots)
    const lines = csv.split('\n')
    expect(lines).toHaveLength(3) // header + 2 rows
  })

  it('skips instruments without snapshots', () => {
    const instruments = [mkInstrument('BTC'), mkInstrument('MISSING')]
    const snapshots = { BTC: mkSnap('BTC', 67000) }
    const csv = snapshotsToCSV(instruments, snapshots)
    const lines = csv.split('\n')
    expect(lines).toHaveLength(2) // header + 1 row
  })

  it('escapes values with commas', () => {
    const inst = mkInstrument('TEST,COMMA')
    const snap = mkSnap('TEST,COMMA', 100)
    const csv = snapshotsToCSV([inst], { 'TEST,COMMA': snap })
    expect(csv).toContain('"TEST,COMMA"')
  })

  it('returns only header when no snapshots', () => {
    const csv = snapshotsToCSV([mkInstrument('X')], {})
    const lines = csv.split('\n')
    expect(lines).toHaveLength(1)
  })
})

// ─── tradesToCSV — backtest trade exports ────────────────────

const mkTrade = (id: number, over: Partial<BacktestTrade> = {}): BacktestTrade => ({
  id,
  direction: 'long',
  entryIndex: 10 * id,
  entryPrice: 100,
  entryTimestamp: '2026-04-19T10:00:00Z',
  entrySignal: 'RSI_OVERSOLD',
  exitIndex: 10 * id + 5,
  exitPrice: 110,
  exitTimestamp: '2026-04-19T15:00:00Z',
  exitReason: 'take_profit',
  pnl: 100,
  pnlPct: 0.1,
  commission: 0.2,
  bars: 5,
  maxFavorable: 0.12,
  maxAdverse: 0.01,
  ...over,
})

const mkResult = (instrumentId: string, trades: BacktestTrade[]): BacktestResult => ({
  config: { ...DEFAULT_CONFIG, instrumentId },
  trades,
  events: [],
  equity: [],
  stats: {
    totalTrades: trades.length, winningTrades: 0, losingTrades: 0, winRate: 0,
    grossProfit: 0, grossLoss: 0, netProfit: 0, profitFactor: 0,
    maxDrawdown: 0, maxDrawdownAmount: 0, sharpeRatio: 0,
    avgWin: 0, avgLoss: 0, avgBars: 0, expectancy: 0,
    totalCommission: 0, finalEquity: 0, totalReturn: 0,
  },
  startTimestamp: '', endTimestamp: '', candleCount: 0,
})

describe('tradesToCSV', () => {
  it('emits a header with every BacktestTrade column + parent instrument_id', () => {
    const csv = tradesToCSV(mkResult('BTC-USD-SPOT', []))
    const header = csv.split('\n')[0]
    for (const col of [
      'instrument_id', 'trade_id', 'direction', 'entry_signal',
      'entry_index', 'entry_timestamp', 'entry_price',
      'exit_index', 'exit_timestamp', 'exit_price', 'exit_reason',
      'bars', 'pnl', 'pnl_pct', 'commission',
      'max_favorable_excursion', 'max_adverse_excursion',
    ]) {
      expect(header).toContain(col)
    }
  })

  it('returns only header when there are no trades (header-only file is still valid)', () => {
    const csv = tradesToCSV(mkResult('BTC-USD-SPOT', []))
    expect(csv.split('\n')).toHaveLength(1)
  })

  it('emits one row per trade', () => {
    const trades = [mkTrade(1), mkTrade(2), mkTrade(3)]
    const csv = tradesToCSV(mkResult('BTC-USD-SPOT', trades))
    expect(csv.split('\n')).toHaveLength(4) // header + 3 rows
  })

  it('repeats the parent instrument_id on every trade row', () => {
    const trades = [mkTrade(1), mkTrade(2)]
    const csv = tradesToCSV(mkResult('ETH-USD-SPOT', trades))
    const dataRows = csv.split('\n').slice(1)
    expect(dataRows.every((r) => r.startsWith('ETH-USD-SPOT,'))).toBe(true)
  })

  it('preserves numeric precision (no rounding to ints)', () => {
    const csv = tradesToCSV(
      mkResult('BTC-USD-SPOT', [mkTrade(1, { pnlPct: 0.0734, entryPrice: 67_842.5 })]),
    )
    expect(csv).toContain('0.0734')
    expect(csv).toContain('67842.5')
  })

  it('preserves the exit_reason string verbatim', () => {
    const csv = tradesToCSV(
      mkResult('BTC-USD-SPOT', [
        mkTrade(1, { exitReason: 'stop_loss' }),
        mkTrade(2, { exitReason: 'end_of_data' }),
      ]),
    )
    expect(csv).toContain('stop_loss')
    expect(csv).toContain('end_of_data')
  })
})
