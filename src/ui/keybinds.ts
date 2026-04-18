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
