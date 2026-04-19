import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ScreenHeader } from '@/ui/components/ScreenHeader'

afterEach(() => cleanup())

describe('<ScreenHeader /> — minimum chrome', () => {
  it('renders the title as an h1', () => {
    render(<ScreenHeader title="Dashboard" />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeInTheDocument()
  })

  it('renders the subtitle when provided', () => {
    render(<ScreenHeader title="Dashboard" subtitle="Vue d'ensemble du marché." />)
    expect(screen.getByText("Vue d'ensemble du marché.")).toBeInTheDocument()
  })

  it('does NOT render a subtitle paragraph when omitted', () => {
    const { container } = render(<ScreenHeader title="Dashboard" />)
    expect(container.querySelector('p')).toBeNull()
  })
})

describe('<ScreenHeader /> — badge + actions slots', () => {
  it('renders the badge node passed by the caller', () => {
    render(
      <ScreenHeader
        title="Trader"
        badge={<span data-testid="live-badge">LIVE</span>}
      />,
    )
    expect(screen.getByTestId('live-badge')).toBeInTheDocument()
  })

  it('renders the actions slot to the right', () => {
    render(
      <ScreenHeader
        title="Chain"
        actions={<button>Run</button>}
      />,
    )
    expect(screen.getByRole('button', { name: 'Run' })).toBeInTheDocument()
  })
})

describe('<ScreenHeader /> — settings drawer toggle', () => {
  it('renders no ⚙ button when settings is omitted', () => {
    render(<ScreenHeader title="Dashboard" />)
    expect(
      screen.queryByRole('button', { name: /Settings — Dashboard/i }),
    ).not.toBeInTheDocument()
  })

  it('renders the ⚙ button when settings is provided', () => {
    render(
      <ScreenHeader
        title="Dashboard"
        settings={<div>some settings</div>}
      />,
    )
    expect(
      screen.getByRole('button', { name: /Settings — Dashboard/i }),
    ).toBeInTheDocument()
  })

  it('toggles the drawer open + closed on ⚙ click', () => {
    render(
      <ScreenHeader
        title="Dashboard"
        settings={<div data-testid="drawer-content">payload</div>}
      />,
    )
    const cog = screen.getByRole('button', { name: /Settings — Dashboard/i })
    expect(screen.queryByTestId('drawer-content')).not.toBeInTheDocument()
    expect(cog).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(cog)
    expect(screen.getByTestId('drawer-content')).toBeInTheDocument()
    expect(cog).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(cog)
    expect(screen.queryByTestId('drawer-content')).not.toBeInTheDocument()
    expect(cog).toHaveAttribute('aria-expanded', 'false')
  })

  it('uses the custom settingsTitle when provided', () => {
    render(
      <ScreenHeader
        title="Dashboard"
        settings={<div>x</div>}
        settingsTitle="Préférences"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Settings — Dashboard/i }))
    expect(screen.getByRole('region', { name: 'Préférences' })).toBeInTheDocument()
  })
})
