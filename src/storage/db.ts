// ─── INDEXED DB WRAPPER ─────────────────────────────────────
// Thin abstraction over IndexedDB for typed access.
// Database: "nexus", version 1
// Stores: snapshots, candles, signals

const DB_NAME = 'nexus'
const DB_VERSION = 3

export const STORES = {
  SNAPSHOTS: 'snapshots',
  CANDLES: 'candles',
  SIGNALS: 'signals',
  DECISIONS: 'decisions',
  VETOS: 'vetos',
  ORDERS: 'orders',
  AUDIT: 'audit',
  POSITIONS: 'positions',
} as const

let _dbPromise: Promise<IDBDatabase> | null = null

export const openDb = (): Promise<IDBDatabase> => {
  if (_dbPromise) return _dbPromise

  _dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      // snapshots: compound key [instrumentId, timestamp]
      if (!db.objectStoreNames.contains(STORES.SNAPSHOTS)) {
        const store = db.createObjectStore(STORES.SNAPSHOTS, {
          keyPath: ['instrumentId', 'timestamp'],
        })
        store.createIndex('by_instrument', 'instrumentId', { unique: false })
        store.createIndex('by_timestamp', 'timestamp', { unique: false })
      }

      // candles: compound key [instrumentId, timeframe, timestamp]
      if (!db.objectStoreNames.contains(STORES.CANDLES)) {
        const store = db.createObjectStore(STORES.CANDLES, {
          keyPath: ['instrumentId', 'timeframe', 'timestamp'],
        })
        store.createIndex('by_instrument_tf', ['instrumentId', 'timeframe'], {
          unique: false,
        })
      }

      // signals: key = id
      if (!db.objectStoreNames.contains(STORES.SIGNALS)) {
        const store = db.createObjectStore(STORES.SIGNALS, { keyPath: 'id' })
        store.createIndex('by_instrument', 'instrumentId', { unique: false })
        store.createIndex('by_timestamp', 'timestamp', { unique: false })
        store.createIndex('by_type', 'type', { unique: false })
      }

      // decisions / vetos / orders: all keyed by id with numeric timestamp
      for (const name of [STORES.DECISIONS, STORES.VETOS, STORES.ORDERS]) {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: 'id' })
          store.createIndex('by_timestamp', 'timestamp', { unique: false })
        }
      }

      // audit: ring buffer, keyed by id, numeric timestamp index
      if (!db.objectStoreNames.contains(STORES.AUDIT)) {
        const store = db.createObjectStore(STORES.AUDIT, { keyPath: 'id' })
        store.createIndex('by_timestamp', 'timestamp', { unique: false })
        store.createIndex('by_module', 'module', { unique: false })
      }

      // positions: keyed by id, indexed by openedAt for recency queries
      if (!db.objectStoreNames.contains(STORES.POSITIONS)) {
        const store = db.createObjectStore(STORES.POSITIONS, { keyPath: 'id' })
        store.createIndex('by_opened', 'openedAt', { unique: false })
        store.createIndex('by_status', 'status', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      _dbPromise = null
      reject(request.error)
    }
  })

  return _dbPromise
}

// ─── TRANSACTION HELPERS ────────────────────────────────────

export const getStore = async (
  storeName: string,
  mode: IDBTransactionMode = 'readonly',
): Promise<IDBObjectStore> => {
  const db = await openDb()
  const tx = db.transaction(storeName, mode)
  return tx.objectStore(storeName)
}

export const idbPut = async <T>(storeName: string, value: T): Promise<void> => {
  const store = await getStore(storeName, 'readwrite')
  return new Promise((resolve, reject) => {
    const req = store.put(value)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export const idbPutBatch = async <T>(
  storeName: string,
  values: T[],
): Promise<void> => {
  const db = await openDb()
  const tx = db.transaction(storeName, 'readwrite')
  const store = tx.objectStore(storeName)

  for (const v of values) {
    store.put(v)
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export const idbGetAll = async <T>(
  storeName: string,
  indexName?: string,
  query?: IDBValidKey | IDBKeyRange,
): Promise<T[]> => {
  const store = await getStore(storeName)
  const target = indexName ? store.index(indexName) : store

  return new Promise((resolve, reject) => {
    const req = target.getAll(query)
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => reject(req.error)
  })
}

export const idbCount = async (
  storeName: string,
  indexName?: string,
  query?: IDBValidKey | IDBKeyRange,
): Promise<number> => {
  const store = await getStore(storeName)
  const target = indexName ? store.index(indexName) : store

  return new Promise((resolve, reject) => {
    const req = target.count(query)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export const idbClear = async (storeName: string): Promise<void> => {
  const store = await getStore(storeName, 'readwrite')
  return new Promise((resolve, reject) => {
    const req = store.clear()
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// ─── PRUNING (delete records older than cutoff) ─────────────

export const idbPruneByTimestamp = async (
  storeName: string,
  cutoffIso: string,
): Promise<number> => {
  const db = await openDb()
  const tx = db.transaction(storeName, 'readwrite')
  const store = tx.objectStore(storeName)
  const index = store.index('by_timestamp')
  const range = IDBKeyRange.upperBound(cutoffIso)

  let deleted = 0
  return new Promise((resolve, reject) => {
    const cursor = index.openCursor(range)
    cursor.onsuccess = () => {
      const c = cursor.result
      if (c) {
        c.delete()
        deleted++
        c.continue()
      }
    }
    tx.oncomplete = () => resolve(deleted)
    tx.onerror = () => reject(tx.error)
  })
}
