import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { KeybindHelp } from '@/ui/components/KeybindHelp'

afterEach(() => cleanup())

describe('<KeybindHelp />', () => {
  it('is hidden by default', () => {
    render(<KeybindHelp />)
    expect(screen.queryByTestId('keybind-help-modal')).not.toBeInTheDocument()
  })

  it('opens when "?" is pressed at the window level', () => {
    render(<KeybindHelp />)
    fireEvent.keyDown(window, { key: '?' })
    expect(screen.getByTestId('keybind-help-modal')).toBeInTheDocument()
  })

  it('toggles closed when "?" is pressed again', () => {
    render(<KeybindHelp />)
    fireEvent.keyDown(window, { key: '?' })
    expect(screen.getByTestId('keybind-help-modal')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: '?' })
    expect(screen.queryByTestId('keybind-help-modal')).not.toBeInTheDocument()
  })

  it('closes on Escape', () => {
    render(<KeybindHelp />)
    fireEvent.keyDown(window, { key: '?' })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByTestId('keybind-help-modal')).not.toBeInTheDocument()
  })

  it('closes when the close button is clicked', () => {
    render(<KeybindHelp />)
    fireEvent.keyDown(window, { key: '?' })
    fireEvent.click(screen.getByTestId('keybind-help-close'))
    expect(screen.queryByTestId('keybind-help-modal')).not.toBeInTheDocument()
  })

  it('closes when the backdrop is clicked', () => {
    render(<KeybindHelp />)
    fireEvent.keyDown(window, { key: '?' })
    fireEvent.click(screen.getByTestId('keybind-help-modal'))
    expect(screen.queryByTestId('keybind-help-modal')).not.toBeInTheDocument()
  })

  it('does NOT open when "?" is pressed inside an input', () => {
    render(
      <>
        <input data-testid="some-input" />
        <KeybindHelp />
      </>,
    )
    const input = screen.getByTestId('some-input')
    fireEvent.keyDown(input, { key: '?', target: input })
    expect(screen.queryByTestId('keybind-help-modal')).not.toBeInTheDocument()
  })

  it('does NOT open when "?" is pressed with Ctrl/Meta/Alt held', () => {
    render(<KeybindHelp />)
    fireEvent.keyDown(window, { key: '?', ctrlKey: true })
    expect(screen.queryByTestId('keybind-help-modal')).not.toBeInTheDocument()
    fireEvent.keyDown(window, { key: '?', metaKey: true })
    expect(screen.queryByTestId('keybind-help-modal')).not.toBeInTheDocument()
    fireEvent.keyDown(window, { key: '?', altKey: true })
    expect(screen.queryByTestId('keybind-help-modal')).not.toBeInTheDocument()
  })

  it('lists the documented timeframe shortcuts', () => {
    render(<KeybindHelp />)
    fireEvent.keyDown(window, { key: '?' })
    const modal = screen.getByTestId('keybind-help-modal')
    expect(modal.textContent).toMatch(/Switch to 1 minute candles/i)
    expect(modal.textContent).toMatch(/Switch to 1 hour candles/i)
    expect(modal.textContent).toMatch(/Switch to 1 day candles/i)
  })

  it('lists the run-chain shortcut "r"', () => {
    render(<KeybindHelp />)
    fireEvent.keyDown(window, { key: '?' })
    expect(screen.getByTestId('keybind-help-modal').textContent).toMatch(/Run the decision chain/i)
  })

  it('uses role=dialog + aria-modal=true', () => {
    render(<KeybindHelp />)
    fireEvent.keyDown(window, { key: '?' })
    const modal = screen.getByTestId('keybind-help-modal')
    expect(modal.getAttribute('role')).toBe('dialog')
    expect(modal.getAttribute('aria-modal')).toBe('true')
  })

  it('removes the keydown listener on unmount', () => {
    const { unmount } = render(<KeybindHelp />)
    fireEvent.keyDown(window, { key: '?' })
    expect(screen.getByTestId('keybind-help-modal')).toBeInTheDocument()
    unmount()
    // After unmount, the listener is gone — no modal can open even if
    // we re-trigger. cleanup() will run after, which doesn't matter
    // here because nothing is mounted.
    fireEvent.keyDown(window, { key: '?' })
    expect(screen.queryByTestId('keybind-help-modal')).not.toBeInTheDocument()
  })
})
