import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { ErrorToast } from '@/ui/components/ErrorToast'
import { reportError, resetReporter } from '@/infra/error-reporter'

beforeEach(() => {
  resetReporter()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  resetReporter()
  vi.useRealTimers()
})

describe('<ErrorToast />', () => {
  it('renders nothing when no errors have been reported', () => {
    render(<ErrorToast />)
    expect(screen.queryByTestId('error-toast-region')).not.toBeInTheDocument()
  })

  it('shows a toast when reportError is called', () => {
    render(<ErrorToast />)
    act(() => {
      reportError(new Error('boom'))
    })
    expect(screen.getByTestId('error-toast')).toBeInTheDocument()
    expect(screen.getByText(/boom/)).toBeInTheDocument()
  })

  it('shows the source tag when present', () => {
    render(<ErrorToast />)
    act(() => {
      reportError(new Error('something went wrong'), { source: 'Detail/chart' })
    })
    expect(screen.getByText(/Error in Detail\/chart/)).toBeInTheDocument()
  })

  it('falls back to plain "Error" when no source provided', () => {
    render(<ErrorToast />)
    act(() => {
      reportError(new Error('untagged'))
    })
    expect(screen.getByText(/^Error$/)).toBeInTheDocument()
  })

  it('handles a non-Error payload (string)', () => {
    render(<ErrorToast />)
    act(() => {
      reportError('plain string error')
    })
    expect(screen.getByText(/plain string error/)).toBeInTheDocument()
  })

  it('handles a non-Error payload (other type)', () => {
    render(<ErrorToast />)
    act(() => {
      reportError({ weird: 'object' })
    })
    expect(screen.getByText(/Unknown error/)).toBeInTheDocument()
  })

  it('caps visible toasts at 3 (FIFO drop oldest)', () => {
    render(<ErrorToast />)
    act(() => {
      reportError(new Error('one'))
      reportError(new Error('two'))
      reportError(new Error('three'))
      reportError(new Error('four'))
    })
    const toasts = screen.getAllByTestId('error-toast')
    expect(toasts).toHaveLength(3)
    // The oldest ("one") was dropped; "four" is the newest visible.
    expect(screen.queryByText(/^one$/)).not.toBeInTheDocument()
    expect(screen.getByText(/^four$/)).toBeInTheDocument()
  })

  it('dismisses a toast on click of the close button', () => {
    render(<ErrorToast />)
    act(() => {
      reportError(new Error('clickable'))
    })
    fireEvent.click(screen.getByTestId('error-toast-close'))
    expect(screen.queryByTestId('error-toast')).not.toBeInTheDocument()
  })

  it('auto-dismisses after the timeout (fake timers)', () => {
    vi.useFakeTimers()
    render(<ErrorToast />)
    act(() => {
      reportError(new Error('vanish'))
    })
    expect(screen.getByTestId('error-toast')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(7_000) // > AUTO_DISMISS_MS (6_000)
    })
    expect(screen.queryByTestId('error-toast')).not.toBeInTheDocument()
  })

  it('uses role=region with aria-label on the container', () => {
    render(<ErrorToast />)
    act(() => {
      reportError(new Error('aria-test'))
    })
    const region = screen.getByTestId('error-toast-region')
    expect(region.getAttribute('role')).toBe('region')
    expect(region.getAttribute('aria-label')).toMatch(/erreur/i)
  })

  it('each toast has role=status with aria-live=polite (screen-reader friendly)', () => {
    render(<ErrorToast />)
    act(() => {
      reportError(new Error('a11y'))
    })
    const toast = screen.getByTestId('error-toast')
    expect(toast.getAttribute('role')).toBe('status')
    expect(toast.getAttribute('aria-live')).toBe('polite')
  })
})
