import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { Sources } from '@/ui/screens/Sources'
import { PROVIDER_DEFS } from '@/providers/registry'

afterEach(() => cleanup())

describe('<Sources />', () => {
  it('renders the standard ScreenHeader with provider count badge', () => {
    render(<Sources />)
    expect(screen.getByText('Data Sources')).toBeInTheDocument()
    const badge = screen.getByTestId('sources-active-badge')
    const active = PROVIDER_DEFS.filter((p) => p.status === 'active').length
    expect(badge.textContent).toContain(`${active}/${PROVIDER_DEFS.length} active`)
  })

  it('renders a card for every registered provider', () => {
    render(<Sources />)
    for (const p of PROVIDER_DEFS) {
      expect(screen.getByText(p.name)).toBeInTheDocument()
    }
  })

  it('exposes the KPI strip', () => {
    render(<Sources />)
    expect(screen.getByText('Total Providers')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Mock')).toBeInTheDocument()
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })
})
