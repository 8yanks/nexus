import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { CookieConsent } from '@/ui/components/CookieConsent'
import { loadConsent, clearConsent, _resetListeners, CONSENT_STORAGE_KEY } from '@/ui/consent'

beforeEach(() => {
  globalThis.localStorage.clear()
  _resetListeners()
})

afterEach(() => {
  cleanup()
  _resetListeners()
})

describe('<CookieConsent />', () => {
  it('renders the banner when consent is unset', () => {
    render(<CookieConsent />)
    expect(screen.getByTestId('cookie-consent-banner')).toBeInTheDocument()
  })

  it('does NOT render when consent is already accepted', () => {
    globalThis.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify('accepted'))
    render(<CookieConsent />)
    expect(screen.queryByTestId('cookie-consent-banner')).not.toBeInTheDocument()
  })

  it('does NOT render when consent is already declined', () => {
    globalThis.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify('declined'))
    render(<CookieConsent />)
    expect(screen.queryByTestId('cookie-consent-banner')).not.toBeInTheDocument()
  })

  it('clicking accept persists the choice + hides the banner', () => {
    render(<CookieConsent />)
    fireEvent.click(screen.getByTestId('cookie-consent-accept'))
    expect(loadConsent()).toBe('accepted')
    expect(screen.queryByTestId('cookie-consent-banner')).not.toBeInTheDocument()
  })

  it('clicking decline persists the choice + hides the banner', () => {
    render(<CookieConsent />)
    fireEvent.click(screen.getByTestId('cookie-consent-decline'))
    expect(loadConsent()).toBe('declined')
    expect(screen.queryByTestId('cookie-consent-banner')).not.toBeInTheDocument()
  })

  it('uses role="dialog" + aria-label for assistive tech', () => {
    render(<CookieConsent />)
    const banner = screen.getByTestId('cookie-consent-banner')
    expect(banner.getAttribute('role')).toBe('dialog')
    expect(banner.getAttribute('aria-label')).toMatch(/confidentialité/i)
  })

  it('mentions that no analytics are currently used', () => {
    render(<CookieConsent />)
    const banner = screen.getByTestId('cookie-consent-banner')
    expect(banner.textContent).toMatch(/aucun cookie/i)
  })

  it('after a clearConsent the banner reappears on next mount', () => {
    globalThis.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify('accepted'))
    const { unmount } = render(<CookieConsent />)
    expect(screen.queryByTestId('cookie-consent-banner')).not.toBeInTheDocument()
    unmount()
    clearConsent()
    render(<CookieConsent />)
    expect(screen.getByTestId('cookie-consent-banner')).toBeInTheDocument()
  })
})
