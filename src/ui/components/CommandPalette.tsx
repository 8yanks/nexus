import { useEffect, useMemo, useRef, useState } from 'react'
import { useMarketStore } from '@/store/market'
import type { Screen } from '@/store/market'
import { CATEGORIES } from '@/ui/nav-categories'
import { colors, fonts } from '@/ui/theme'

// ─── COMMAND PALETTE — Cmd/Ctrl+K ───────────────────────────
//
// Fast jump to any screen or instrument from anywhere in the app.
// Same shape as Linear / Slack / Vercel command palettes:
// - Cmd/Ctrl+K opens
// - Type to filter (case-insensitive substring on label + symbol)
// - ArrowUp/Down navigates the list
// - Enter executes the selected action
// - Esc closes
//
// Two action sources for now:
// 1. Every navigable screen (via CATEGORIES from nav-categories.ts)
// 2. Every instrument (via store.instruments) — selecting one drills
//    into Detail with that instrument focused
//
// New action sources can be appended to `buildActions(...)` later
// (e.g. "Toggle theme", "Run backtest", "Export trades CSV"). The
// palette logic stays the same.

const SCREEN_LABELS_LOCAL: Partial<Record<Screen, string>> = {
  dashboard:   'Dashboard',
  scanner:     'Scanner',
  correlation: 'Correlation',
  macro:       'Macro Pulse',
  chain:       'Chain Monitor',
  sentinel:    'Sentinel',
  trader:      'Trader',
  backtest:    'Backtest',
  quality:     'Data Quality',
  vcflow:      'VC Flow',
  corporate:   'Corporate',
  alerts:      'Alerts',
  journal:     'Journal',
  sources:     'Sources',
  export:      'Export',
  options:     'Options',
  legal:       'Legal',
}

interface ActionScreen {
  kind: 'screen'
  id: string
  label: string
  hint: string
  screen: Screen
}

interface ActionInstrument {
  kind: 'instrument'
  id: string
  label: string
  hint: string
  instrumentId: string
}

type Action = ActionScreen | ActionInstrument

export const CommandPalette = () => {
  const setScreen = useMarketStore((s) => s.setScreen)
  const selectInstrument = useMarketStore((s) => s.selectInstrument)
  const instruments = useMarketStore((s) => s.instruments)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Build the canonical action list from the nav categories + the
  // store's instrument list. Memoised so typing doesn't rebuild on
  // every keystroke.
  const allActions = useMemo<Action[]>(() => {
    const out: Action[] = []
    for (const cat of CATEGORIES) {
      for (const screen of cat.screens) {
        const label = SCREEN_LABELS_LOCAL[screen] ?? screen
        out.push({
          kind: 'screen',
          id: `screen:${screen}`,
          label,
          hint: cat.label,
          screen,
        })
      }
    }
    for (const inst of instruments) {
      out.push({
        kind: 'instrument',
        id: `inst:${inst.id}`,
        label: inst.symbol,
        hint: `${inst.name} · ${inst.exchange}`,
        instrumentId: inst.id,
      })
    }
    return out
  }, [instruments])

  // Filter on label + hint; fall back to substring match (no fuzzy
  // matcher dep — the lists are small enough).
  const filtered = useMemo<Action[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allActions.slice(0, 30) // cap initial render — 30 is enough to scroll
    return allActions.filter((a) =>
      a.label.toLowerCase().includes(q) || a.hint.toLowerCase().includes(q),
    )
  }, [query, allActions])

  // Reset highlight whenever the filtered list changes shape.
  useEffect(() => {
    setHighlight(0)
  }, [query])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K opens (any context — typing in a field too).
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
        setQuery('')
        return
      }
      if (!open) return
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlight((h) => Math.min(filtered.length - 1, h + 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlight((h) => Math.max(0, h - 1))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const action = filtered[highlight]
        if (action) execute(action)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filtered, highlight])

  // Auto-focus the input on open.
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  const execute = (action: Action) => {
    if (action.kind === 'screen') {
      setScreen(action.screen)
    } else {
      selectInstrument(action.instrumentId)
    }
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      data-testid="command-palette"
      onClick={() => setOpen(false)}
      // Prevent the global isTypingTarget guard from interpreting
      // the input as a "skip my hotkey" zone — we WANT the input to
      // capture keys, so just don't propagate them.
      onKeyDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        zIndex: 220,
        padding: '15vh 24px 24px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.bgCard,
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
          width: '100%',
          maxWidth: 560,
          boxShadow: '0 16px 64px rgba(0,0,0,0.55)',
          fontFamily: fonts.sans,
          color: colors.text,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '70vh',
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          // The palette itself uses its own keyboard handling — make
          // sure the unrelated typing-target gate never blocks Esc /
          // Arrow / Enter inside it.
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          placeholder="Jump to a screen or instrument…"
          aria-label="Command palette query"
          data-testid="command-palette-input"
          style={{
            background: colors.bgInput,
            border: 'none',
            borderBottom: `1px solid ${colors.border}`,
            borderRadius: '8px 8px 0 0',
            padding: '14px 18px',
            fontSize: 14,
            color: colors.text,
            outline: 'none',
            fontFamily: fonts.sans,
          }}
        />
        <div
          role="listbox"
          aria-label="Available commands"
          data-testid="command-palette-list"
          style={{ overflowY: 'auto', padding: '4px 0' }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: '24px 18px',
                fontSize: 12,
                color: colors.textMuted,
                textAlign: 'center',
              }}
              data-testid="command-palette-empty"
            >
              No matches for "{query}".
            </div>
          ) : (
            filtered.map((action, i) => {
              const active = i === highlight
              return (
                <button
                  key={action.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  data-testid={`command-palette-item-${action.id}`}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => execute(action)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    background: active ? `${colors.accent}20` : 'transparent',
                    border: 'none',
                    padding: '8px 18px',
                    fontFamily: fonts.sans,
                    fontSize: 13,
                    color: active ? colors.accent : colors.text,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontWeight: 500 }}>
                    <span style={{ color: colors.textMuted, marginRight: 8, fontSize: 11, textTransform: 'uppercase' }}>
                      {action.kind === 'screen' ? 'Go' : 'Open'}
                    </span>
                    {action.label}
                  </span>
                  <span
                    style={{
                      color: colors.textMuted,
                      fontSize: 11,
                      fontFamily: fonts.mono,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {action.hint}
                  </span>
                </button>
              )
            })
          )}
        </div>
        <div
          style={{
            padding: '8px 18px',
            borderTop: `1px solid ${colors.border}`,
            fontSize: 11,
            color: colors.textMuted,
            fontFamily: fonts.mono,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>↑↓ navigate · Enter select · Esc close</span>
          <span>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  )
}
