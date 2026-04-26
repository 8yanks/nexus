// ─── ERROR REPORTING — Sentry-shaped no-op transport ────────
//
// Single chokepoint for "something just blew up in the UI". The
// implementation today is a no-op (logs to console in dev, silent in
// prod) so we don't need a Sentry account to run the app — but the
// shape mirrors `Sentry.captureException(err, { contexts, tags })`
// so swapping in real Sentry later is a one-file change:
//
//   import * as Sentry from '@sentry/react'
//   Sentry.init({ dsn: config.sentryDsn })
//   export const reportError = (err, context) =>
//     Sentry.captureException(err, { contexts: { app: context ?? {} } })
//
// All call sites stay untouched.

export interface ErrorContext {
  /** Component / feature where the error happened. e.g. "Detail/chart". */
  source?: string
  /** Free-form tags (instrument id, screen, action). */
  tags?: Record<string, string | number | boolean | null>
  /** Anything else we want to ship along (state slice, props, etc.). */
  extra?: Record<string, unknown>
}

export interface ErrorReporter {
  capture(err: unknown, context?: ErrorContext): void
}

/**
 * Default reporter: console.error in dev (so the dev console flags
 * the issue), no-op in prod (no PII leakage to a 3rd party until
 * Sentry is actually wired). Swap via `setReporter(...)` for tests
 * or to install a real provider.
 */
const defaultReporter: ErrorReporter = {
  capture(err, context) {
    if (typeof globalThis !== 'undefined' && globalThis.console) {
      // We use console.error so DevTools picks it up; in prod the
      // browser usually swallows it unless verbose logging is on.
      // eslint-disable-next-line no-console
      console.error('[error-reporter]', err, context ?? {})
    }
  },
}

let _current: ErrorReporter = defaultReporter

export const setReporter = (r: ErrorReporter): void => {
  _current = r
}

export const resetReporter = (): void => {
  _current = defaultReporter
}

export const reportError = (err: unknown, context?: ErrorContext): void => {
  try {
    _current.capture(err, context)
  } catch {
    // The reporter itself blew up — never throw out of the chokepoint.
    // (Real Sentry once shipped a bug where capture threw on cyclic
    //  contexts and crashed every consumer.)
  }
}
