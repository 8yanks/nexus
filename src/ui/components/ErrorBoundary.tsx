import { Component, type ErrorInfo, type ReactNode } from 'react'
import { reportError } from '@/infra/error-reporter'
import { colors, fonts } from '@/ui/theme'

// ─── ERROR BOUNDARY ─────────────────────────────────────────
//
// React's chosen way to catch render-phase exceptions before they
// blank-screen the whole app. Wraps the screen tree in App.tsx so a
// busted Backtest screen doesn't take Dashboard down with it.
//
// The fallback UI is intentionally austere — when the app is in this
// state, we don't want the recovery UI to itself depend on broken
// theme tokens or missing children. Inline styles, no icons, single
// button.
//
// Reset semantics: the user clicks "Try again" to remount the tree
// (state cleared). If the same crash re-fires, they see this screen
// again — better than a white page.

interface Props {
  children: ReactNode
  /** Tag attached to the error report so we know WHICH boundary fired. */
  source?: string
  /**
   * Optional override for the fallback UI. Most callers should let it
   * default — the only reason to override is a top-level boundary that
   * needs a richer "send a bug report" surface.
   */
  fallback?: (err: Error, reset: () => void) => ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(error, {
      source: this.props.source ?? 'ErrorBoundary',
      extra: {
        // componentStack is the render-tree path to the throwing
        // component — useful to know whether it was Backtest, Detail,
        // a chart effect, etc.
        componentStack: info.componentStack,
      },
    })
  }

  reset = (): void => {
    this.setState({ error: null })
  }

  render(): ReactNode {
    const { error } = this.state
    if (error == null) return this.props.children
    if (this.props.fallback) return this.props.fallback(error, this.reset)
    return (
      <div
        role="alert"
        data-testid="error-boundary-fallback"
        style={{
          padding: '32px 24px',
          color: colors.text,
          fontFamily: fonts.sans,
          maxWidth: 720,
          margin: '40px auto',
          background: colors.bgCard,
          border: `1px solid ${colors.red}40`,
          borderRadius: 6,
        }}
      >
        <h2 style={{ margin: '0 0 8px', color: colors.red, fontSize: 16, fontWeight: 700 }}>
          Something went wrong
        </h2>
        <p style={{ fontSize: 13, color: colors.textSecondary, marginTop: 0 }}>
          {this.props.source
            ? `An error in ${this.props.source} was caught before it broke the rest of the app.`
            : 'An unexpected error was caught before it broke the rest of the app.'}
        </p>
        <details
          style={{
            marginTop: 12,
            padding: 8,
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: 4,
            fontFamily: fonts.mono,
            fontSize: 11,
            color: colors.textMuted,
          }}
        >
          <summary style={{ cursor: 'pointer', color: colors.textSecondary }}>
            error details
          </summary>
          <pre style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {error.message}
            {error.stack ? `\n\n${error.stack}` : ''}
          </pre>
        </details>
        <button
          type="button"
          onClick={this.reset}
          data-testid="error-boundary-reset"
          style={{
            marginTop: 16,
            padding: '6px 14px',
            background: colors.accent,
            color: colors.bg,
            border: 'none',
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: fonts.sans,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    )
  }
}
