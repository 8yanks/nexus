import { describe, it, expect } from 'vitest'
import { snapshotsToCSV } from '@/export/csv'
import type { Instrument, MarketSnapshot } from '@/types'

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
