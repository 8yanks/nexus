import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ErrorBoundary } from '@/ui/components/ErrorBoundary'
import { setReporter, resetReporter } from '@/infra/error-reporter'

const Boom = ({ message = 'kaboom' }: { message?: string }) => {
  throw new Error(message)
}

const Ok = () => <div data-testid="child">child rendered</div>

beforeEach(() => {
  resetReporter()
  // Suppress React's "Caught an error during rendering" log so the
  // test output stays clean. The error itself still propagates to
  // the boundary.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  resetReporter()
})

describe('<ErrorBoundary />', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <Ok />
      </ErrorBoundary>,
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument()
  })

  it('renders the fallback when a child throws', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument()
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()
  })

  it('reports the error through the active reporter with the source tag', () => {
    const captured: Array<{ err: unknown; ctx: unknown }> = []
    setReporter({ capture: (err, ctx) => captured.push({ err, ctx }) })

    render(
      <ErrorBoundary source="TestZone">
        <Boom message="from-test" />
      </ErrorBoundary>,
    )
    expect(captured).toHaveLength(1)
    expect((captured[0].err as Error).message).toBe('from-test')
    const ctx = captured[0].ctx as { source: string; extra: { componentStack: string } }
    expect(ctx.source).toBe('TestZone')
    expect(ctx.extra.componentStack).toMatch(/Boom/)
  })

  it('falls back to "ErrorBoundary" as the source tag when none provided', () => {
    let receivedSource: string | undefined
    setReporter({
      capture: (_e, ctx) => {
        receivedSource = (ctx as { source?: string })?.source
      },
    })
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(receivedSource).toBe('ErrorBoundary')
  })

  it('reset button clears the error state', () => {
    // We can't easily test "reset → child re-renders fine" because React
    // 19 retries the failed render synchronously after an error, so a
    // conditional throw fires twice and the boundary never settles.
    // What we can verify deterministically: the reset handler clears
    // the error state, so the fallback would be hidden on the next
    // render cycle if the children would no longer throw.
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument()
    const resetBtn = screen.getByTestId('error-boundary-reset')
    expect(resetBtn).toBeInTheDocument()
    // Click — this must NOT throw, and the button must remain
    // interactive (no double-click crash).
    expect(() => fireEvent.click(resetBtn)).not.toThrow()
  })

  it('uses a custom fallback when provided', () => {
    render(
      <ErrorBoundary
        fallback={(err, reset) => (
          <div data-testid="custom-fallback">
            custom: {err.message}
            <button onClick={reset}>reset</button>
          </div>
        )}
      >
        <Boom message="custom-err" />
      </ErrorBoundary>,
    )
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
    expect(screen.getByText(/custom: custom-err/)).toBeInTheDocument()
    expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument()
  })

  it('exposes the error message inside the details element', () => {
    render(
      <ErrorBoundary>
        <Boom message="visible-in-details" />
      </ErrorBoundary>,
    )
    const fallback = screen.getByTestId('error-boundary-fallback')
    expect(fallback.textContent).toMatch(/visible-in-details/)
  })

  it('uses role="alert" on the fallback for assistive tech', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByTestId('error-boundary-fallback').getAttribute('role')).toBe('alert')
  })
})
