import { useEffect, useState } from 'react'
import { colors, fonts } from '@/ui/theme'

// ─── KEYBIND HELP MODAL ─────────────────────────────────────
//
// Global ? trigger shows the keyboard shortcut cheat sheet. Same
// pattern as Gmail / Notion / Linear — discoverable without touching
// docs. Shortcut grouping mirrors what's actually wired in the app
// today; new keybinds added later should append a row here.
//
// Open trigger: ? (no modifiers, not in a typing target).
// Close trigger: Escape OR click on the backdrop.
//
// We deliberately avoid overlap with browser-reserved combos:
// - No Ctrl/Cmd shortcuts in the global scope (would clash with
//   browser save/find/etc.)
// - No single-letter shortcuts that conflict with native form widgets
//   (the typing-target gate handles most cases).

interface KeyRow {
  keys: string[] // Display labels per key chip
  description: string
}

interface KeySection {
  title: string
  rows: KeyRow[]
}

const SECTIONS: KeySection[] = [
  {
    title: 'Global',
    rows: [
      { keys: ['?'], description: 'Open this help' },
      { keys: ['Esc'], description: 'Close modals / dismiss splash' },
    ],
  },
  {
    title: 'Chart timeframe (Detail screen)',
    rows: [
      { keys: ['1'], description: 'Switch to 1 minute candles' },
      { keys: ['5'], description: 'Switch to 5 minutes candles' },
      { keys: ['q'], description: 'Switch to 15 minutes candles' },
      { keys: ['h'], description: 'Switch to 1 hour candles' },
      { keys: ['4'], description: 'Switch to 4 hours candles' },
      { keys: ['d'], description: 'Switch to 1 day candles' },
    ],
  },
  {
    title: 'Decision pipeline (ChainMonitor)',
    rows: [{ keys: ['r'], description: 'Run the decision chain now' }],
  },
]

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!target) return false
  const el = target as Partial<HTMLElement> & { tagName?: string }
  if (el.tagName && new Set(['INPUT', 'TEXTAREA', 'SELECT']).has(el.tagName)) return true
  if (el.isContentEditable) return true
  return false
}

export const KeybindHelp = () => {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Open on '?' — note this fires when user presses Shift+/ on a
      // US layout, which the browser reports as `key === '?'` directly.
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (isTypingTarget(e.target)) return
        e.preventDefault()
        setOpen((v) => !v)
        return
      }
      // Esc closes — only when we own the modal (avoid stealing Esc from
      // other dialogs that have their own handlers).
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      data-testid="keybind-help-modal"
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 150,
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.bgCard,
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
          padding: 24,
          maxWidth: 560,
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
          fontFamily: fonts.sans,
          color: colors.text,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Keyboard shortcuts</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            data-testid="keybind-help-close"
            aria-label="Close keyboard shortcuts"
            style={{
              background: 'transparent',
              border: `1px solid ${colors.border}`,
              borderRadius: 4,
              color: colors.textMuted,
              padding: '2px 10px',
              fontSize: 11,
              fontFamily: fonts.mono,
              cursor: 'pointer',
            }}
          >
            esc
          </button>
        </div>

        {SECTIONS.map((section) => (
          <div key={section.title} style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 11,
                color: colors.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              {section.title}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', alignItems: 'center' }}>
              {section.rows.map((row, i) => (
                <RowFragment key={i} row={row} />
              ))}
            </div>
          </div>
        ))}

        <p style={{ marginTop: 16, marginBottom: 0, fontSize: 11, color: colors.textMuted, lineHeight: 1.6 }}>
          Tip — most shortcuts are scoped to the screen they belong to.
          Hotkeys are disabled while typing in form fields.
        </p>
      </div>
    </div>
  )
}

const RowFragment = ({ row }: { row: KeyRow }) => (
  <>
    <div style={{ display: 'flex', gap: 4 }}>
      {row.keys.map((k) => (
        <kbd
          key={k}
          style={{
            display: 'inline-block',
            minWidth: 22,
            padding: '2px 6px',
            background: colors.bgInput,
            border: `1px solid ${colors.border}`,
            borderRadius: 4,
            fontFamily: fonts.mono,
            fontSize: 11,
            color: colors.text,
            textAlign: 'center',
            lineHeight: 1.4,
          }}
        >
          {k}
        </kbd>
      ))}
    </div>
    <div style={{ fontSize: 13, color: colors.textSecondary }}>{row.description}</div>
  </>
)
