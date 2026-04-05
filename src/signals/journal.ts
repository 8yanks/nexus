import type { SignalEvent } from '@/types'

// ─── IN-MEMORY SIGNAL JOURNAL ───────────────────────────────
// Stores detected signals in memory with a configurable cap.
// No persistence (no localStorage) — resets on reload.

const MAX_ENTRIES = 500

let _entries: SignalEvent[] = []

export const addSignal = (signal: SignalEvent): void => {
  _entries.push(signal)
  if (_entries.length > MAX_ENTRIES) {
    _entries = _entries.slice(-MAX_ENTRIES)
  }
}

export const addSignals = (signals: SignalEvent[]): void => {
  for (const s of signals) addSignal(s)
}

export const getJournal = (): ReadonlyArray<SignalEvent> => _entries

export const getJournalForInstrument = (
  instrumentId: string,
): ReadonlyArray<SignalEvent> =>
  _entries.filter((s) => s.instrumentId === instrumentId)

export const getRecentSignals = (
  maxAgeMs = 300_000,
): ReadonlyArray<SignalEvent> => {
  const cutoff = Date.now() - maxAgeMs
  return _entries.filter((s) => new Date(s.timestamp).getTime() > cutoff)
}

export const clearJournal = (): void => {
  _entries = []
}

export const journalSize = (): number => _entries.length
