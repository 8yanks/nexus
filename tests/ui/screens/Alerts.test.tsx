import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Alerts } from '@/ui/screens/Alerts'
import { useMarketStore } from '@/store/market'
import type { AlertRule } from '@/types'

const rule = (over: Partial<AlertRule> = {}): AlertRule => ({
  id: `r_${Math.random().toString(36).slice(2, 8)}`,
  instrumentId: 'BTCUSD',
  type: 'price_above',
  value: 75_000,
  active: true,
  triggered: false,
  severity: 'warning',
  triggeredAt: null,
  ...over,
})

const reset = () => useMarketStore.setState({ alertRules: [] })

beforeEach(reset)
afterEach(() => cleanup())

describe('<Alerts />', () => {
  it('renders standard ScreenHeader with active count badge', () => {
    useMarketStore.setState({ alertRules: [rule({ active: true }), rule({ active: false })] })
    render(<Alerts />)
    expect(screen.getByText('Alert Rules')).toBeInTheDocument()
    expect(screen.getByTestId('alerts-active-badge').textContent).toContain('1 active')
  })

  it('shows the empty state when no rules are configured', () => {
    render(<Alerts />)
    expect(screen.getByText(/No alert rules configured/i)).toBeInTheDocument()
  })

  it('renders rule rows and KPI counts derived from severity + active', () => {
    useMarketStore.setState({
      alertRules: [
        rule({ id: 'a', active: true, severity: 'critical' }),
        rule({ id: 'b', active: false, severity: 'warning' }),
        rule({ id: 'c', active: true, severity: 'critical' }),
      ],
    })
    render(<Alerts />)
    // Header shows 2 active.
    expect(screen.getByTestId('alerts-active-badge').textContent).toContain('2 active')
    // KPI: critical = 2.
    const criticalCard = screen.getByText('Critical').parentElement!
    expect(criticalCard.textContent).toContain('2')
  })

  it('toggles a rule on click', () => {
    useMarketStore.setState({ alertRules: [rule({ id: 'tog', active: true })] })
    render(<Alerts />)
    const btn = screen.getByTitle('Disable')
    fireEvent.click(btn)
    expect(useMarketStore.getState().alertRules.find((r) => r.id === 'tog')?.active).toBe(false)
  })

  it('removes a rule on click of trash', () => {
    useMarketStore.setState({ alertRules: [rule({ id: 'rm' })] })
    render(<Alerts />)
    fireEvent.click(screen.getByTitle('Remove'))
    expect(useMarketStore.getState().alertRules).toHaveLength(0)
  })
})
