import { describe, it, expect } from 'vitest'
import { isRunChainShortcut, timeframeShortcutFor } from '@/ui/keybinds'

const ev = (
  key: string,
  opts: {
    ctrlKey?: boolean
    metaKey?: boolean
    altKey?: boolean
    target?: { tagName?: string; isContentEditable?: boolean } | null
  } = {},
) => ({ key, ...opts })

describe('isRunChainShortcut', () => {
  it('matches lowercase r', () => {
    expect(isRunChainShortcut(ev('r'))).toBe(true)
  })

  it('matches uppercase R', () => {
    expect(isRunChainShortcut(ev('R'))).toBe(true)
  })

  it('rejects other letters', () => {
    expect(isRunChainShortcut(ev('q'))).toBe(false)
    expect(isRunChainShortcut(ev('Enter'))).toBe(false)
  })

  it('rejects when ctrl/meta/alt is held (would collide with browser shortcuts)', () => {
    expect(isRunChainShortcut(ev('r', { ctrlKey: true }))).toBe(false)
    expect(isRunChainShortcut(ev('r', { metaKey: true }))).toBe(false)
    expect(isRunChainShortcut(ev('r', { altKey: true }))).toBe(false)
  })

  it('rejects when an input is focused', () => {
    expect(isRunChainShortcut(ev('r', { target: { tagName: 'INPUT' } }))).toBe(false)
  })

  it('rejects when a textarea is focused', () => {
    expect(isRunChainShortcut(ev('r', { target: { tagName: 'TEXTAREA' } }))).toBe(false)
  })

  it('rejects when a select is focused', () => {
    expect(isRunChainShortcut(ev('r', { target: { tagName: 'SELECT' } }))).toBe(false)
  })

  it('rejects when target is contenteditable', () => {
    expect(
      isRunChainShortcut(
        ev('r', { target: { tagName: 'DIV', isContentEditable: true } }),
      ),
    ).toBe(false)
  })

  it('accepts when target is a benign element (button, body, etc.)', () => {
    expect(isRunChainShortcut(ev('r', { target: { tagName: 'BUTTON' } }))).toBe(true)
    expect(isRunChainShortcut(ev('r', { target: { tagName: 'BODY' } }))).toBe(true)
    expect(isRunChainShortcut(ev('r', { target: null }))).toBe(true)
  })
})

describe('timeframeShortcutFor', () => {
  it('maps each shortcut key to the matching timeframe', () => {
    expect(timeframeShortcutFor(ev('1'))).toBe('1m')
    expect(timeframeShortcutFor(ev('5'))).toBe('5m')
    expect(timeframeShortcutFor(ev('q'))).toBe('15m')
    expect(timeframeShortcutFor(ev('h'))).toBe('1h')
    expect(timeframeShortcutFor(ev('4'))).toBe('4h')
    expect(timeframeShortcutFor(ev('d'))).toBe('1d')
  })

  it('accepts the uppercase variants of the alpha shortcuts', () => {
    expect(timeframeShortcutFor(ev('Q'))).toBe('15m')
    expect(timeframeShortcutFor(ev('H'))).toBe('1h')
    expect(timeframeShortcutFor(ev('D'))).toBe('1d')
  })

  it('returns null for unknown keys', () => {
    expect(timeframeShortcutFor(ev('a'))).toBeNull()
    expect(timeframeShortcutFor(ev('Enter'))).toBeNull()
    expect(timeframeShortcutFor(ev('Escape'))).toBeNull()
    expect(timeframeShortcutFor(ev('2'))).toBeNull()    // 2m not in our enum
    expect(timeframeShortcutFor(ev('3'))).toBeNull()
  })

  it('rejects when ctrl/meta/alt is held (would collide with browser shortcuts)', () => {
    expect(timeframeShortcutFor(ev('1', { ctrlKey: true }))).toBeNull()
    expect(timeframeShortcutFor(ev('h', { metaKey: true }))).toBeNull()
    expect(timeframeShortcutFor(ev('d', { altKey: true }))).toBeNull()
  })

  it('rejects when an input/textarea/select is focused', () => {
    expect(timeframeShortcutFor(ev('1', { target: { tagName: 'INPUT' } }))).toBeNull()
    expect(timeframeShortcutFor(ev('h', { target: { tagName: 'TEXTAREA' } }))).toBeNull()
    expect(timeframeShortcutFor(ev('d', { target: { tagName: 'SELECT' } }))).toBeNull()
  })

  it('rejects when target is contenteditable', () => {
    expect(
      timeframeShortcutFor(
        ev('1', { target: { tagName: 'DIV', isContentEditable: true } }),
      ),
    ).toBeNull()
  })

  it('accepts when target is a benign element (button, body, etc.)', () => {
    expect(timeframeShortcutFor(ev('1', { target: { tagName: 'BUTTON' } }))).toBe('1m')
    expect(timeframeShortcutFor(ev('h', { target: { tagName: 'BODY' } }))).toBe('1h')
    expect(timeframeShortcutFor(ev('d', { target: null }))).toBe('1d')
  })
})
