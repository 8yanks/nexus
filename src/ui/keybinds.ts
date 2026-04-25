// ─── KEYBIND HELPERS ────────────────────────────────────────
// Pure, DOM-light predicates so the keybind gating rules are
// unit-testable without mounting components.

interface KeyEventLike {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
  target?: EventTarget | null
}

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/** True when the event originates from a form control or contenteditable. */
const isTypingTarget = (target: EventTarget | null | undefined): boolean => {
  if (!target) return false
  const el = target as Partial<HTMLElement> & { tagName?: string }
  if (el.tagName && TYPING_TAGS.has(el.tagName)) return true
  if (el.isContentEditable) return true
  return false
}

/**
 * Predicate for the "press 'r' to run the chain" shortcut.
 *
 * Active only when:
 * - the key is r/R with no modifiers,
 * - the user is NOT typing in a form field or contenteditable,
 * - no modal is open (callers pass a flag).
 *
 * Modal-blocking is the caller's responsibility because shortcut
 * scopes vary (a future global cmd-palette would have a different
 * gating rule). Keep this predicate purely about the key + target.
 */
export const isRunChainShortcut = (e: KeyEventLike): boolean => {
  if (e.key !== 'r' && e.key !== 'R') return false
  if (e.ctrlKey || e.metaKey || e.altKey) return false
  if (isTypingTarget(e.target)) return false
  return true
}

import type { Timeframe } from '@/ui/timeframe-memory'

/**
 * Map a single key press to a timeframe, or null if the key isn't
 * one of our shortcuts. Used by the Detail screen to let the user
 * switch TF without reaching for the toolbar pills.
 *
 * Mapping:
 *   1 → 1m,  5 → 5m,  q → 15m (no two-digit keys),
 *   h → 1h,  4 → 4h,  d → 1d
 *
 * Same gating as the chain shortcut: no modifiers, not in a typing
 * field. The caller decides whether the screen scope applies.
 */
export const timeframeShortcutFor = (e: KeyEventLike): Timeframe | null => {
  if (e.ctrlKey || e.metaKey || e.altKey) return null
  if (isTypingTarget(e.target)) return null
  switch (e.key) {
    case '1':
      return '1m'
    case '5':
      return '5m'
    case 'q':
    case 'Q':
      return '15m'
    case 'h':
    case 'H':
      return '1h'
    case '4':
      return '4h'
    case 'd':
    case 'D':
      return '1d'
    default:
      return null
  }
}
