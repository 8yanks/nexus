import { useEffect, useState } from 'react'
import { setReporter, resetReporter, type ErrorContext } from '@/infra/error-reporter'
import { colors, fonts } from '@/ui/theme'

// ─── ERROR TOAST ────────────────────────────────────────────
//
// Visible feedback when something goes wrong. Wires into the same
// `reportError` chokepoint as ErrorBoundary so a single toast surface
// catches:
// - render-phase crashes (forwarded by ErrorBoundary.componentDidCatch)
// - any explicit `reportError(err, ctx)` call in app code
// - future Sentry-bridged events when the real provider is wired
//
// Up to MAX_VISIBLE toasts at a time, oldest-first (FIFO). Each
// auto-dismisses after AUTO_DISMISS_MS, can be dismissed manually
// via the close button.
//
// On mount, this component installs itself as the active reporter.
// In the case where Sentry is wired later, prefer to:
//   - keep this toast for user-visible feedback,
//   - layer a multi-reporter that fans out to BOTH this toast AND
//     Sentry.captureException.

const MAX_VISIBLE = 3
const AUTO_DISMISS_MS = 6_000

interface ToastEntry {
  id: number
  message: string
  source: string | null
  ts: number
}

let _seq = 0
const nextId = (): number => ++_seq

export const ErrorToast = () => {
  const [toasts, setToasts] = useState<ToastEntry[]>([])

  useEffect(() => {
    setReporter({
      capture: (err, ctx?: ErrorContext) => {
        const message =
          err instanceof Error
            ? err.message
            : typeof err === 'string'
              ? err
              : 'Unknown error'
        const source = ctx?.source ?? null
        // Console too — devs need the full stack, not just the message.
        // eslint-disable-next-line no-console
        console.error('[error-toast]', err, ctx ?? {})
        setToasts((prev) => {
          const next = [...prev, { id: nextId(), message, source, ts: Date.now() }]
          // FIFO — drop the oldest if we exceed the cap so the screen
          // never gets covered in stacked toasts.
          return next.length > MAX_VISIBLE ? next.slice(next.length - MAX_VISIBLE) : next
        })
      },
    })
    return () => {
      resetReporter()
    }
  }, [])

  // Auto-dismiss the oldest toast after AUTO_DISMISS_MS. Using a
  // single rolling timer keyed on the oldest entry's id keeps the
  // logic simple and avoids per-toast timer leaks.
  useEffect(() => {
    if (toasts.length === 0) return
    const oldest = toasts[0]
    const elapsed = Date.now() - oldest.ts
    const remaining = Math.max(0, AUTO_DISMISS_MS - elapsed)
    const t = window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== oldest.id))
    }, remaining)
    return () => window.clearTimeout(t)
  }, [toasts])

  if (toasts.length === 0) return null

  return (
    <div
      role="region"
      aria-label="Notifications d'erreur"
      data-testid="error-toast-region"
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 180,
        maxWidth: 360,
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          data-testid="error-toast"
          style={{
            background: colors.bgCard,
            border: `1px solid ${colors.red}50`,
            borderLeft: `3px solid ${colors.red}`,
            borderRadius: 4,
            padding: '10px 12px',
            fontFamily: fonts.sans,
            fontSize: 12,
            color: colors.text,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: colors.red, marginBottom: 2 }}>
              {toast.source ? `Error in ${toast.source}` : 'Error'}
            </div>
            <div style={{ color: colors.textSecondary, lineHeight: 1.4, wordBreak: 'break-word' }}>
              {toast.message}
            </div>
          </div>
          <button
            type="button"
            data-testid="error-toast-close"
            aria-label="Dismiss"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== toast.id))}
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.textMuted,
              cursor: 'pointer',
              fontSize: 14,
              lineHeight: 1,
              padding: 2,
              alignSelf: 'flex-start',
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
