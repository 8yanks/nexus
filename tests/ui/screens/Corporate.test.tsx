import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import { Corporate } from '@/ui/screens/Corporate'

afterEach(() => cleanup())

describe('<Corporate />', () => {
  it('renders the standard ScreenHeader and loading state', () => {
    render(<Corporate />)
    expect(screen.getByText('Corporate Intelligence')).toBeInTheDocument()
    expect(screen.getByTestId('corporate-events-badge')).toBeInTheDocument()
    expect(screen.getByText(/Loading corporate events/i)).toBeInTheDocument()
  })

  it('populates the badge with bias counts after loading', async () => {
    render(<Corporate />)
    await waitFor(() => {
      const badge = screen.getByTestId('corporate-events-badge')
      // Format: "{n} evt · {b}↑ · {b}↓ · {h} high".
      expect(badge.textContent).toMatch(/\d+ evt/)
      expect(badge.textContent).toMatch(/↑/)
      expect(badge.textContent).toMatch(/↓/)
      expect(badge.textContent).toMatch(/high/)
    })
  })

  it('shows the SIMULATED disclaimer', () => {
    render(<Corporate />)
    expect(screen.getByText('SIMULATED')).toBeInTheDocument()
  })

  it('renders the filter bar (Ticker / Bias / Priority labels)', () => {
    render(<Corporate />)
    expect(screen.getByText('Ticker')).toBeInTheDocument()
    expect(screen.getByText('Bias')).toBeInTheDocument()
    expect(screen.getByText('Priority')).toBeInTheDocument()
  })
})
