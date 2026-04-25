import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { NotFinancialAdviceBanner } from '@/ui/components/NotFinancialAdviceBanner'

afterEach(() => cleanup())

describe('<NotFinancialAdviceBanner />', () => {
  it('renders the standard NOT FINANCIAL ADVICE banner', () => {
    render(<NotFinancialAdviceBanner />)
    expect(screen.getByTestId('nfa-banner')).toBeInTheDocument()
    expect(screen.getByText('NOT FINANCIAL ADVICE')).toBeInTheDocument()
  })

  it('uses a role=note for assistive tech (informative not actionable)', () => {
    render(<NotFinancialAdviceBanner />)
    const banner = screen.getByTestId('nfa-banner')
    expect(banner.getAttribute('role')).toBe('note')
    expect(banner.getAttribute('aria-label')).toMatch(/not financial advice/i)
  })

  it('mentions responsibility lies with the user', () => {
    render(<NotFinancialAdviceBanner />)
    // Plain-language disclaimer must be self-contained — no dependency
    // on tooltip / hover to convey the legal hint.
    const banner = screen.getByTestId('nfa-banner')
    expect(banner.textContent).toMatch(/responsibility/i)
  })

  it('renders an optional context phrase when provided', () => {
    render(<NotFinancialAdviceBanner context="Simulated fills only." />)
    expect(screen.getByTestId('nfa-banner').textContent).toMatch(/Simulated fills only\./)
  })

  it('omits the context phrase when not provided', () => {
    const { container } = render(<NotFinancialAdviceBanner />)
    // No trailing " · " separator should appear when context is absent.
    expect(container.textContent).not.toMatch(/ · /)
  })
})
