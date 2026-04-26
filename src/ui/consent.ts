// ─── COOKIE CONSENT — store + helpers ───────────────────────
//
// RGPD-friendly opt-in for analytics / monitoring. Three states:
// - 'unset'      → user hasn't decided yet → banner is shown
// - 'accepted'   → user opted in → analytics may run
// - 'declined'   → user opted out → analytics MUST NOT run
//
// The store API is one read (`loadConsent`), one write
// (`saveConsent`), one event hook (`onConsentChange`). Consumers
// (Plausible loader, Sentry init, etc.) check `loadConsent() ===
// 'accepted'` before initializing.
//
// We deliberately default to 'unset' (NOT 'declined') so:
// - first-time users see the banner and get to choose explicitly
// - "no decision yet" is distinguishable from "active opt-out" in
//   case we ever want to re-prompt (e.g. policy update)
//
// Storage is localStorage (cookie-less — the irony) under the
// nexus.* namespace consistent with screen-memory + timeframe-memory.

export type ConsentState = 'unset' | 'accepted' | 'declined'

export const CONSENT_STORAGE_KEY = 'nexus.consent.v1'
const VALID_STATES = new Set<ConsentState>(['unset', 'accepted', 'declined'])

const isConsentState = (v: unknown): v is ConsentState =>
  typeof v === 'string' && VALID_STATES.has(v as ConsentState)

export const loadConsent = (): ConsentState => {
  try {
    const raw = globalThis.localStorage?.getItem(CONSENT_STORAGE_KEY)
    if (!raw) return 'unset'
    const parsed = JSON.parse(raw) as unknown
    return isConsentState(parsed) ? parsed : 'unset'
  } catch {
    return 'unset'
  }
}

export const saveConsent = (state: ConsentState): void => {
  try {
    globalThis.localStorage?.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* localStorage unavailable — silently no-op */
  }
  // Notify subscribers synchronously so analytics can init/teardown
  // the same paint as the user clicks accept/decline.
  for (const listener of _listeners) {
    try {
      listener(state)
    } catch {
      /* never let one bad listener break the rest */
    }
  }
}

export const clearConsent = (): void => {
  try {
    globalThis.localStorage?.removeItem(CONSENT_STORAGE_KEY)
  } catch {
    /* no-op */
  }
}

// ── Subscriber API ──────────────────────────────────────
const _listeners = new Set<(state: ConsentState) => void>()

/**
 * Register a callback that fires when `saveConsent(...)` is called.
 * Returns an unsubscribe function. Use this to wire up analytics
 * loaders that need to react to opt-in / opt-out without polling.
 */
export const onConsentChange = (cb: (state: ConsentState) => void): (() => void) => {
  _listeners.add(cb)
  return () => {
    _listeners.delete(cb)
  }
}

/** Test-only: clear all subscribers between test runs. */
export const _resetListeners = (): void => {
  _listeners.clear()
}
