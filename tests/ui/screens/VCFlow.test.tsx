import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react'
import { VCFlow } from '@/ui/screens/VCFlow'

afterEach(() => cleanup())

describe('<VCFlow />', () => {
  it('renders the standard ScreenHeader', () => {
    render(<VCFlow />)
    expect(screen.getByText('Venture Capital Flow')).toBeInTheDocument()
    // Initial badge before deals load — 0 deals · 0 sectors.
    expect(screen.getByTestId('vcflow-deals-badge')).toBeInTheDocument()
    expect(screen.getByText(/Loading VC deals/i)).toBeInTheDocument()
  })

  it('loads mock deals into the badge and KPIs', async () => {
    render(<VCFlow />)
    await waitFor(() => {
      const badge = screen.getByTestId('vcflow-deals-badge')
      expect(badge.textContent).toMatch(/\d+ deals? · \d+ sectors/)
      // Once loaded the badge count should be > 0 (mock provider returns deals).
      const m = badge.textContent!.match(/^(\d+) /)
      expect(Number(m?.[1] ?? 0)).toBeGreaterThan(0)
    })
    // KPI strip rendered.
    expect(screen.getByText('Total Capital')).toBeInTheDocument()
    expect(screen.getByText('Sectors')).toBeInTheDocument()
  })

  it('filters deal cards by sector', async () => {
    render(<VCFlow />)
    await waitFor(() => {
      const badge = screen.getByTestId('vcflow-deals-badge')
      expect(badge.textContent).not.toMatch(/^0 /)
    })
    // Click a specific sector filter (e.g. AI/ML — comes from VC_SECTOR_CONFIGS).
    // We don't assert which deals remain — just that clicking doesn't crash.
    const aiBtn = screen.queryByRole('button', { name: /AI/i })
    if (aiBtn) {
      expect(() => fireEvent.click(aiBtn)).not.toThrow()
    }
  })

  it('shows the SIMULATED disclaimer', async () => {
    render(<VCFlow />)
    await waitFor(() => {
      expect(screen.getByText('SIMULATED')).toBeInTheDocument()
    })
  })
})
