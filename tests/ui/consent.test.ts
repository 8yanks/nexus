import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  loadConsent,
  saveConsent,
  clearConsent,
  onConsentChange,
  _resetListeners,
  CONSENT_STORAGE_KEY,
} from '@/ui/consent'

describe('consent store', () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
    _resetListeners()
  })

  afterEach(() => {
    _resetListeners()
  })

  it('defaults to "unset" when nothing is persisted', () => {
    expect(loadConsent()).toBe('unset')
  })

  it('round-trips each valid state', () => {
    saveConsent('accepted')
    expect(loadConsent()).toBe('accepted')
    saveConsent('declined')
    expect(loadConsent()).toBe('declined')
    saveConsent('unset')
    expect(loadConsent()).toBe('unset')
  })

  it('returns "unset" when storage holds malformed JSON', () => {
    globalThis.localStorage.setItem(CONSENT_STORAGE_KEY, '{not-json')
    expect(loadConsent()).toBe('unset')
  })

  it('returns "unset" when storage holds an unknown enum value', () => {
    globalThis.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify('maybe'))
    expect(loadConsent()).toBe('unset')
  })

  it('returns "unset" for non-string payloads', () => {
    globalThis.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(42))
    expect(loadConsent()).toBe('unset')
  })

  it('clearConsent removes the stored value', () => {
    saveConsent('accepted')
    expect(loadConsent()).toBe('accepted')
    clearConsent()
    expect(loadConsent()).toBe('unset')
  })

  it('onConsentChange fires subscribers on saveConsent', () => {
    const seen: string[] = []
    const stop = onConsentChange((s) => seen.push(s))
    saveConsent('accepted')
    saveConsent('declined')
    expect(seen).toEqual(['accepted', 'declined'])
    stop()
  })

  it('onConsentChange returns an unsubscribe that stops further calls', () => {
    const seen: string[] = []
    const stop = onConsentChange((s) => seen.push(s))
    stop()
    saveConsent('accepted')
    expect(seen).toEqual([])
  })

  it('a throwing subscriber does not block others from firing', () => {
    const seen: string[] = []
    onConsentChange(() => {
      throw new Error('bad subscriber')
    })
    onConsentChange((s) => seen.push(s))
    saveConsent('accepted')
    expect(seen).toEqual(['accepted'])
  })
})
