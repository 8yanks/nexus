import type { AlertEvaluation } from './engine'

// ─── NOTIFIER (STUB) ────────────────────────────────────────
// Future: dispatch to browser notifications, Telegram, Discord, etc.
// For now, collects triggered alerts in memory.

let _history: AlertEvaluation[] = []
const MAX_HISTORY = 200

export const notify = (evaluation: AlertEvaluation): void => {
  if (!evaluation.triggered) return
  _history.push(evaluation)
  if (_history.length > MAX_HISTORY) {
    _history = _history.slice(-MAX_HISTORY)
  }
}

export const notifyAll = (evaluations: AlertEvaluation[]): void => {
  for (const e of evaluations) notify(e)
}

export const getNotificationHistory = (): ReadonlyArray<AlertEvaluation> => _history

export const clearNotificationHistory = (): void => {
  _history = []
}
