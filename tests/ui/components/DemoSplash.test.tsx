import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { DemoSplash } from '@/ui/components/DemoSplash'

afterEach(() => cleanup())

describe('<DemoSplash />', () => {
  it('renders the NEXUS title and ANALYST MODE eyebrow', () => {
    render(<DemoSplash onDismiss={() => {}} />)
    expect(screen.getByRole('heading', { level: 1, name: 'NEXUS' })).toBeInTheDocument()
    expect(screen.getByText('ANALYST MODE')).toBeInTheDocument()
  })

  it('renders all three bots in the architecture grid', () => {
    render(<DemoSplash onDismiss={() => {}} />)
    expect(screen.getByText('Analyst')).toBeInTheDocument()
    expect(screen.getByText('Sentinel')).toBeInTheDocument()
    expect(screen.getByText('Trader')).toBeInTheDocument()
    // All three carry the ACTIVE tag (no SKELETONs left).
    expect(screen.getAllByText('ACTIVE')).toHaveLength(3)
  })

  it('renders the shared-packages chip row', () => {
    render(<DemoSplash onDismiss={() => {}} />)
    // 5 packages × `@nexus/<name>` chip
    expect(screen.getByText('@nexus/shared-types')).toBeInTheDocument()
    expect(screen.getByText('@nexus/shared-utils')).toBeInTheDocument()
    expect(screen.getByText('@nexus/shared-signals')).toBeInTheDocument()
    expect(screen.getByText('@nexus/shared-clients')).toBeInTheDocument()
    expect(screen.getByText('@nexus/shared-infra')).toBeInTheDocument()
  })

  it('renders the stats strip with refreshed counts', () => {
    render(<DemoSplash onDismiss={() => {}} />)
    // Labels
    expect(screen.getByText('Instruments')).toBeInTheDocument()
    expect(screen.getByText('Screens')).toBeInTheDocument()
    expect(screen.getByText('Tests')).toBeInTheDocument()
    // Refreshed values from the 2026-04-19 polish pass
    expect(screen.getByText('16')).toBeInTheDocument()  // Screens
    expect(screen.getByText('652+')).toBeInTheDocument() // Tests
  })

  it('renders the Enter Dashboard CTA button', () => {
    render(<DemoSplash onDismiss={() => {}} />)
    expect(screen.getByRole('button', { name: 'Enter Dashboard' })).toBeInTheDocument()
  })

  it('clicking the Enter button dismisses + fires onDismiss', () => {
    const onDismiss = vi.fn()
    render(<DemoSplash onDismiss={onDismiss} />)
    fireEvent.click(screen.getByRole('button', { name: 'Enter Dashboard' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
    // Component returns null after dismissal
    expect(screen.queryByRole('heading', { level: 1, name: 'NEXUS' })).not.toBeInTheDocument()
  })

  it('pressing Escape dismisses + fires onDismiss', () => {
    const onDismiss = vi.fn()
    render(<DemoSplash onDismiss={onDismiss} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('heading', { level: 1, name: 'NEXUS' })).not.toBeInTheDocument()
  })

  it('pressing Enter dismisses + fires onDismiss', () => {
    const onDismiss = vi.fn()
    render(<DemoSplash onDismiss={onDismiss} />)
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('ignores unrelated keys', () => {
    const onDismiss = vi.fn()
    render(<DemoSplash onDismiss={onDismiss} />)
    fireEvent.keyDown(window, { key: 'a' })
    fireEvent.keyDown(window, { key: 'Tab' })
    fireEvent.keyDown(window, { key: 'Space' })
    expect(onDismiss).not.toHaveBeenCalled()
    // Splash still mounted
    expect(screen.getByRole('heading', { level: 1, name: 'NEXUS' })).toBeInTheDocument()
  })

  it('clicking the backdrop dismisses', () => {
    const onDismiss = vi.fn()
    const { container } = render(<DemoSplash onDismiss={onDismiss} />)
    // Outermost positioned div is the backdrop.
    const backdrop = container.firstChild as HTMLElement
    fireEvent.click(backdrop)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('clicking inside the modal card does not dismiss', () => {
    const onDismiss = vi.fn()
    render(<DemoSplash onDismiss={onDismiss} />)
    // Click on a chip — well inside the card — should not bubble out.
    fireEvent.click(screen.getByText('@nexus/shared-types'))
    expect(onDismiss).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { level: 1, name: 'NEXUS' })).toBeInTheDocument()
  })

  it('removes its keydown listener on unmount', () => {
    const onDismiss = vi.fn()
    const { unmount } = render(<DemoSplash onDismiss={onDismiss} />)
    unmount()
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onDismiss).not.toHaveBeenCalled()
  })
})
