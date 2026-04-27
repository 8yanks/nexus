import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { CommandPalette } from '@/ui/components/CommandPalette'
import { useMarketStore } from '@/store/market'

beforeEach(() => {
  // Reset relevant store slices to a known state.
  useMarketStore.setState({
    screen: 'dashboard',
    selectedInstrumentId: null,
  })
})

afterEach(() => cleanup())

describe('<CommandPalette />', () => {
  it('is hidden by default', () => {
    render(<CommandPalette />)
    expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument()
  })

  it('opens on Ctrl+K', () => {
    render(<CommandPalette />)
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(screen.getByTestId('command-palette')).toBeInTheDocument()
    expect(screen.getByTestId('command-palette-input')).toBeInTheDocument()
  })

  it('opens on Cmd+K (Meta)', () => {
    render(<CommandPalette />)
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(screen.getByTestId('command-palette')).toBeInTheDocument()
  })

  it('toggles closed when triggered again', () => {
    render(<CommandPalette />)
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument()
  })

  it('closes on Escape', () => {
    render(<CommandPalette />)
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument()
  })

  it('lists every navigable screen on initial open', () => {
    render(<CommandPalette />)
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    const list = screen.getByTestId('command-palette-list')
    // A few representative screens.
    expect(list.textContent).toMatch(/Dashboard/)
    expect(list.textContent).toMatch(/Backtest/)
    expect(list.textContent).toMatch(/Legal/)
  })

  it('lists instruments alongside screens', () => {
    render(<CommandPalette />)
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    // Test against the BTC spot instrument that's always in INSTRUMENTS.
    const item = screen.getByTestId('command-palette-item-inst:BTC-USD-SPOT')
    expect(item).toBeInTheDocument()
  })

  it('filters by typing in the input', () => {
    render(<CommandPalette />)
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    const input = screen.getByTestId('command-palette-input')
    fireEvent.change(input, { target: { value: 'backtest' } })
    expect(screen.queryByTestId('command-palette-item-screen:dashboard')).not.toBeInTheDocument()
    expect(screen.getByTestId('command-palette-item-screen:backtest')).toBeInTheDocument()
  })

  it('shows the empty state when no matches', () => {
    render(<CommandPalette />)
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    fireEvent.change(screen.getByTestId('command-palette-input'), {
      target: { value: 'zzz-no-such-screen-or-instrument' },
    })
    expect(screen.getByTestId('command-palette-empty')).toBeInTheDocument()
  })

  it('clicking a screen item navigates to that screen + closes', () => {
    render(<CommandPalette />)
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    fireEvent.click(screen.getByTestId('command-palette-item-screen:backtest'))
    expect(useMarketStore.getState().screen).toBe('backtest')
    expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument()
  })

  it('clicking an instrument item drills into Detail with that id', () => {
    render(<CommandPalette />)
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    fireEvent.click(screen.getByTestId('command-palette-item-inst:BTC-USD-SPOT'))
    expect(useMarketStore.getState().screen).toBe('detail')
    expect(useMarketStore.getState().selectedInstrumentId).toBe('BTC-USD-SPOT')
  })

  it('closes when the backdrop is clicked', () => {
    render(<CommandPalette />)
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    fireEvent.click(screen.getByTestId('command-palette'))
    expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument()
  })

  it('uses role=dialog + aria-modal=true', () => {
    render(<CommandPalette />)
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    const palette = screen.getByTestId('command-palette')
    expect(palette.getAttribute('role')).toBe('dialog')
    expect(palette.getAttribute('aria-modal')).toBe('true')
  })

  it('list uses role=listbox + items use role=option', () => {
    render(<CommandPalette />)
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    const list = screen.getByTestId('command-palette-list')
    expect(list.getAttribute('role')).toBe('listbox')
    const firstItem = screen.getByTestId('command-palette-item-screen:dashboard')
    expect(firstItem.getAttribute('role')).toBe('option')
  })
})
