import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ScreenSettings } from '@/ui/components/ScreenSettings'

afterEach(() => cleanup())

describe('<ScreenSettings /> — chrome', () => {
  it('renders as a region with the given title as accessible name', () => {
    render(
      <ScreenSettings title="Settings — Dashboard" onClose={() => {}}>
        body
      </ScreenSettings>,
    )
    expect(
      screen.getByRole('region', { name: 'Settings — Dashboard' }),
    ).toBeInTheDocument()
  })

  it('renders the title as an h2', () => {
    render(
      <ScreenSettings title="Title" onClose={() => {}}>
        body
      </ScreenSettings>,
    )
    expect(
      screen.getByRole('heading', { level: 2, name: 'Title' }),
    ).toBeInTheDocument()
  })

  it('renders the children passed by the caller', () => {
    render(
      <ScreenSettings title="X" onClose={() => {}}>
        <div data-testid="payload">hello</div>
      </ScreenSettings>,
    )
    expect(screen.getByTestId('payload')).toBeInTheDocument()
  })
})

describe('<ScreenSettings /> — close behaviour', () => {
  it('clicking the X button calls onClose', () => {
    const onClose = vi.fn()
    render(
      <ScreenSettings title="X" onClose={onClose}>
        body
      </ScreenSettings>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Close settings' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Escape on the body calls onClose', () => {
    const onClose = vi.fn()
    render(
      <ScreenSettings title="X" onClose={onClose}>
        body
      </ScreenSettings>,
    )
    // Body is the active element by default in jsdom.
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Escape inside the drawer also calls onClose', () => {
    const onClose = vi.fn()
    render(
      <ScreenSettings title="X" onClose={onClose}>
        <input data-testid="inside" />
      </ScreenSettings>,
    )
    const inside = screen.getByTestId('inside') as HTMLInputElement
    inside.focus()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('non-Escape keys do nothing', () => {
    const onClose = vi.fn()
    render(
      <ScreenSettings title="X" onClose={onClose}>
        body
      </ScreenSettings>,
    )
    fireEvent.keyDown(document, { key: 'a' })
    fireEvent.keyDown(document, { key: 'Enter' })
    expect(onClose).not.toHaveBeenCalled()
  })
})
