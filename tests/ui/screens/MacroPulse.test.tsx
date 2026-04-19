import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import { MacroPulse } from '@/ui/screens/MacroPulse'

afterEach(() => cleanup())

describe('<MacroPulse />', () => {
  it('renders the loading-state ScreenHeader before mock data resolves', () => {
    render(<MacroPulse />)
    expect(screen.getByText('Macro Pulse')).toBeInTheDocument()
    expect(screen.getByText(/Loading macro data/i)).toBeInTheDocument()
    // No badge in loading state.
    expect(screen.queryByTestId('macro-counts-badge')).not.toBeInTheDocument()
  })

  it('switches to populated state with the indicator + upcoming-event counts in the badge', async () => {
    render(<MacroPulse />)
    await waitFor(() => {
      expect(screen.getByTestId('macro-counts-badge')).toBeInTheDocument()
    })
    const badge = screen.getByTestId('macro-counts-badge')
    expect(badge.textContent).toMatch(/\d+ ind · \d+ upcoming/)
  })
})
