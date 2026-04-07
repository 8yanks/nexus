import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { openDb, idbPut, idbPutBatch, idbGetAll, idbCount, idbClear, STORES } from '@/storage/db'

// Reset IDB between tests
beforeEach(async () => {
  const db = await openDb()
  for (const name of [STORES.SNAPSHOTS, STORES.CANDLES, STORES.SIGNALS]) {
    if (db.objectStoreNames.contains(name)) {
      const tx = db.transaction(name, 'readwrite')
      tx.objectStore(name).clear()
      await new Promise<void>((resolve) => { tx.oncomplete = () => resolve() })
    }
  }
})

describe('Storage — IndexedDB Wrapper', () => {
  it('openDb returns a database', async () => {
    const db = await openDb()
    expect(db.name).toBe('nexus')
    expect(db.objectStoreNames.contains(STORES.SNAPSHOTS)).toBe(true)
    expect(db.objectStoreNames.contains(STORES.CANDLES)).toBe(true)
    expect(db.objectStoreNames.contains(STORES.SIGNALS)).toBe(true)
  })

  it('idbPut + idbGetAll round-trips a signal', async () => {
    const signal = {
      id: 'sig_1',
      instrumentId: 'BTC-USD-SPOT',
      type: 'RSI_OVERSOLD',
      direction: 'bullish',
      strength: 0.8,
      description: 'test',
      price: 67000,
      timestamp: '2024-01-01T00:00:00Z',
      _source: 'test',
      _status: 'SIMULATED',
    }
    await idbPut(STORES.SIGNALS, signal)
    const all = await idbGetAll(STORES.SIGNALS)
    expect(all).toHaveLength(1)
    expect((all[0] as typeof signal).id).toBe('sig_1')
  })

  it('idbPutBatch inserts multiple records', async () => {
    const signals = [
      { id: 's1', instrumentId: 'BTC', type: 'RSI_OVERSOLD', timestamp: '2024-01-01T00:00:00Z' },
      { id: 's2', instrumentId: 'ETH', type: 'BB_SQUEEZE', timestamp: '2024-01-02T00:00:00Z' },
      { id: 's3', instrumentId: 'SOL', type: 'HIGH_VOLUME', timestamp: '2024-01-03T00:00:00Z' },
    ]
    await idbPutBatch(STORES.SIGNALS, signals)
    const count = await idbCount(STORES.SIGNALS)
    expect(count).toBe(3)
  })

  it('idbGetAll with index filters by instrumentId', async () => {
    const signals = [
      { id: 's1', instrumentId: 'BTC', type: 'RSI_OVERSOLD', timestamp: '2024-01-01T00:00:00Z' },
      { id: 's2', instrumentId: 'ETH', type: 'BB_SQUEEZE', timestamp: '2024-01-02T00:00:00Z' },
    ]
    await idbPutBatch(STORES.SIGNALS, signals)
    const btcSignals = await idbGetAll(STORES.SIGNALS, 'by_instrument', 'BTC')
    expect(btcSignals).toHaveLength(1)
  })

  it('idbClear removes all records', async () => {
    await idbPutBatch(STORES.SIGNALS, [
      { id: 'a', instrumentId: 'X', timestamp: '2024-01-01T00:00:00Z' },
      { id: 'b', instrumentId: 'Y', timestamp: '2024-01-02T00:00:00Z' },
    ])
    expect(await idbCount(STORES.SIGNALS)).toBe(2)
    await idbClear(STORES.SIGNALS)
    expect(await idbCount(STORES.SIGNALS)).toBe(0)
  })

  it('idbCount returns correct count', async () => {
    expect(await idbCount(STORES.SIGNALS)).toBe(0)
    await idbPut(STORES.SIGNALS, { id: 'x', instrumentId: 'A', timestamp: '2024-01-01T00:00:00Z' })
    expect(await idbCount(STORES.SIGNALS)).toBe(1)
  })
})
