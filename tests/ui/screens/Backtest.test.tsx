import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { Backtest } from '@/ui/screens/Backtest'

afterEach(() => cleanup())

describe('<Backtest />', () => {
  it('renders the standard ScreenHeader with the idle badge by default', () => {
    render(<Backtest />)
    expect(screen.getByText('Backtest Engine')).toBeInTheDocument()
    expect(screen.getByTestId('backtest-state-badge').textContent).toBe('idle')
  })

  it('exposes a Run Backtest button in the config panel', () => {
    render(<Backtest />)
    expect(screen.getByRole('button', { name: /Run Backtest/i })).toBeInTheDocument()
  })
})
