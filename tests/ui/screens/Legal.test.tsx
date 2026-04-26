import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Legal } from '@/ui/screens/Legal'

afterEach(() => cleanup())

describe('<Legal />', () => {
  it('renders the screen header + the always-on placeholder notice', () => {
    render(<Legal />)
    expect(screen.getByRole('heading', { name: /Documents Légaux/i })).toBeInTheDocument()
    expect(screen.getByTestId('legal-placeholder-notice')).toBeInTheDocument()
    expect(screen.getByText(/BROUILLON — NON OPPOSABLE/)).toBeInTheDocument()
  })

  it('renders the three tabs (Disclaimer / CGU / Privacy)', () => {
    render(<Legal />)
    expect(screen.getByTestId('legal-tab-disclaimer')).toBeInTheDocument()
    expect(screen.getByTestId('legal-tab-terms')).toBeInTheDocument()
    expect(screen.getByTestId('legal-tab-privacy')).toBeInTheDocument()
  })

  it('starts on the Disclaimer tab by default', () => {
    render(<Legal />)
    expect(screen.getByTestId('legal-tab-disclaimer').getAttribute('aria-selected')).toBe('true')
    expect(screen.getByTestId('legal-panel-disclaimer')).toBeInTheDocument()
  })

  it('switches panels on tab click', () => {
    render(<Legal />)
    fireEvent.click(screen.getByTestId('legal-tab-terms'))
    expect(screen.getByTestId('legal-panel-terms')).toBeInTheDocument()
    expect(screen.queryByTestId('legal-panel-disclaimer')).not.toBeInTheDocument()
    expect(screen.getByTestId('legal-tab-terms').getAttribute('aria-selected')).toBe('true')
    expect(screen.getByTestId('legal-tab-disclaimer').getAttribute('aria-selected')).toBe('false')
  })

  it('Disclaimer panel mentions the 5 risk categories', () => {
    render(<Legal />)
    const panel = screen.getByTestId('legal-panel-disclaimer')
    expect(panel.textContent).toMatch(/RISQUE DE MARCHÉ/i)
    expect(panel.textContent).toMatch(/RISQUE DE MODÈLE/i)
    expect(panel.textContent).toMatch(/RISQUE DE BACKTEST/i)
    expect(panel.textContent).toMatch(/RISQUE DE DONNÉES/i)
    expect(panel.textContent).toMatch(/RISQUE TECHNIQUE/i)
  })

  it('Privacy panel lists the third-party data recipients', () => {
    render(<Legal />)
    fireEvent.click(screen.getByTestId('legal-tab-privacy'))
    const panel = screen.getByTestId('legal-panel-privacy')
    expect(panel.textContent).toMatch(/Binance/)
    expect(panel.textContent).toMatch(/Coinbase/)
    expect(panel.textContent).toMatch(/Anthropic/)
  })

  it('Terms panel mentions the limitation of liability section', () => {
    render(<Legal />)
    fireEvent.click(screen.getByTestId('legal-tab-terms'))
    expect(screen.getByTestId('legal-panel-terms').textContent).toMatch(/LIMITATION DE RESPONSABILITÉ/i)
  })

  it('NotFinancialAdviceBanner is mounted on the screen', () => {
    render(<Legal />)
    expect(screen.getByTestId('nfa-banner')).toBeInTheDocument()
  })

  it('uses role=tablist and role=tab for assistive tech', () => {
    render(<Legal />)
    expect(screen.getByTestId('legal-tabs').getAttribute('role')).toBe('tablist')
    expect(screen.getByTestId('legal-tab-disclaimer').getAttribute('role')).toBe('tab')
  })
})
