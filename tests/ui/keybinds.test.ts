import { describe, it, expect } from 'vitest'
import { isRunChainShortcut } from '@/ui/keybinds'

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
