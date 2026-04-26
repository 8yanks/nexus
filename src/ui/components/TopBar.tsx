import { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { useMarketStore } from '@/store/market'
import type { Screen } from '@/store/market'
import { colors, fonts, radius } from '@/ui/theme'

// ─── TOP BAR — slim chrome above the content area ──────────
//
// Sits at the top of the right pane (Sidebar | [TopBar / Content /
// StatusBar]). 44px tall, compact, mono-flavoured. Three slots:
//
//   • LEFT   — current screen title (derived from the route)
//   • CENTER — global instrument search with autocomplete; clicking a
//              result navigates to Detail with that instrument focused
//   • RIGHT  — ANALYST MODE chip (→ Options), live indicator (→
//              Sources), wall clock (HH:MM:SS, ticks every 1s)
//
// All three live in the same horizontal flex; the search caps at
// 360px so it never crowds the title or the right cluster.

const SCREEN_TITLES: Record<Screen, string> = {
  dashboard:   'Dashboard',
  detail:      'Detail',
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
  legal:       'Documents Légaux',
}

const fmtClock = (d: Date): string =>
  d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

export const TopBar = () => {
  const screen = useMarketStore((s) => s.screen)
  const setScreen = useMarketStore((s) => s.setScreen)
  const selectInstrument = useMarketStore((s) => s.selectInstrument)
  const instruments = useMarketStore((s) => s.instruments)
  const binanceConnected = useMarketStore((s) => s.binanceConnected)
  const coinbaseConnected = useMarketStore((s) => s.coinbaseConnected)
  const krakenConnected = useMarketStore((s) => s.krakenConnected)

  // ── Wall clock (1s tick). Local interval keeps the rest of the app
  // free from re-rendering every second.
  const [now, setNow] = useState<Date>(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // ── Search state. Matches against symbol + name; cap to 8 results.
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const blurTimer = useRef<number | null>(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return instruments
      .filter(
        (inst) =>
          inst.symbol.toLowerCase().includes(q) ||
          inst.name.toLowerCase().includes(q),
      )
      .slice(0, 8)
  }, [query, instruments])

  const onSelectResult = (id: string) => {
    selectInstrument(id)
    setScreen('detail')
    setQuery('')
    setFocused(false)
    inputRef.current?.blur()
  }

  // Keep the dropdown open while the user moves from the input to a
  // result (mousedown fires before blur). The 120ms timeout is enough
  // for the click to register.
  const onBlurDeferred = () => {
    if (blurTimer.current) window.clearTimeout(blurTimer.current)
    blurTimer.current = window.setTimeout(() => setFocused(false), 120)
  }

  const providerStates = [
    { id: 'binance',  connected: binanceConnected  },
    { id: 'coinbase', connected: coinbaseConnected },
    { id: 'kraken',   connected: krakenConnected   },
  ]
  const liveCount = providerStates.filter((p) => p.connected).length
  const totalCount = providerStates.length
  const allLive = liveCount === totalCount
  const anyLive = liveCount > 0

  return (
    <header
      role="banner"
      style={{
        height: 44,
        flexShrink: 0,
        display: 'grid',
        gridTemplateColumns: 'minmax(160px, 1fr) minmax(0, 360px) auto',
        alignItems: 'center',
        gap: 16,
        padding: '0 16px',
        background: colors.bgCard,
        borderBottom: `1px solid ${colors.border}`,
        fontFamily: fonts.sans,
      }}
    >
      {/* ─── LEFT: screen title ─── */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: colors.text,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {SCREEN_TITLES[screen]}
      </div>

      {/* ─── CENTER: search ─── */}
      <div style={{ position: 'relative', justifySelf: 'stretch' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: colors.bgCardAlt,
            border: `1px solid ${focused ? colors.cyan : colors.border}`,
            borderRadius: radius.input,
            padding: '4px 10px',
            transition: 'border-color 0.15s ease',
          }}
        >
          <Search size={13} style={{ color: colors.textDim, flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            role="searchbox"
            aria-label="Search instruments"
            placeholder="Search instruments…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={onBlurDeferred}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: colors.text,
              fontSize: 12,
              fontFamily: fonts.sans,
              minWidth: 0,
            }}
          />
        </div>

        {/* Autocomplete dropdown. Renders only when focused AND we have
            a non-empty query — empty focus stays quiet. */}
        {focused && results.length > 0 && (
          <ul
            role="listbox"
            aria-label="Instrument search results"
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              maxHeight: 280,
              overflowY: 'auto',
              margin: 0,
              padding: 4,
              listStyle: 'none',
              background: colors.bgCard,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.input,
              boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
              zIndex: 20,
            }}
          >
            {results.map((inst) => (
              <li key={inst.id}>
                <button
                  type="button"
                  // mousedown fires before the input's blur, so the click
                  // actually lands on this button instead of being lost.
                  onMouseDown={(e) => {
                    e.preventDefault()
                    onSelectResult(inst.id)
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '6px 10px',
                    border: 'none',
                    background: 'transparent',
                    color: colors.text,
                    cursor: 'pointer',
                    borderRadius: radius.btn,
                    textAlign: 'left',
                    fontFamily: fonts.sans,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = colors.bgHover
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                  }}
                >
                  <span
                    style={{
                      fontFamily: fonts.mono,
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    {inst.symbol}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: colors.textMuted,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {inst.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ─── RIGHT: chips + clock ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifySelf: 'end' }}>
        {/* Always-visible legal hint: every order routed by this app
            goes through the PaperTrader, never a real broker. The
            badge has no click action — it's a passive disclaimer that
            sits in the chrome so screenshots / shoulder-surfers can
            never miss it. */}
        <span
          aria-label="This app is paper-trading only. No real orders are sent to any broker."
          title={
            'PAPER TRADING\n' +
            'No real orders are placed against any broker. Every "execute"\n' +
            'in this app routes to the in-process PaperTrader.'
          }
          data-testid="topbar-paper-trading-badge"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 10px',
            borderRadius: radius.badge,
            background: `${colors.yellow}1a`,
            border: `1px solid ${colors.yellow}66`,
            fontFamily: fonts.mono,
            fontSize: 10,
            fontWeight: 700,
            color: colors.yellow,
            letterSpacing: '0.08em',
            cursor: 'help',
            userSelect: 'none',
          }}
        >
          PAPER TRADING
        </span>
        <button
          type="button"
          onClick={() => setScreen('options')}
          aria-label="Analyst mode — research only, no live trades. Open Options."
          title={
            'Analyst mode\n' +
            'Research & monitoring only. No live trading — every order routes\n' +
            'to the paper broker. Click to open Options.'
          }
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 10px',
            borderRadius: radius.badge,
            background: colors.bgHover,
            border: `1px solid ${colors.border}`,
            cursor: 'pointer',
            fontFamily: fonts.mono,
            fontSize: 10,
            fontWeight: 700,
            color: colors.textSecondary,
            letterSpacing: '0.08em',
          }}
        >
          ANALYST MODE
        </button>

        <button
          type="button"
          onClick={() => setScreen('sources')}
          aria-label={`${liveCount} of ${totalCount} market-data providers connected. Open Sources.`}
          title={`Market-data providers (click to open Sources)`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 8px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            borderRadius: radius.badge,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: anyLive ? (allLive ? colors.green : colors.yellow) : colors.red,
              boxShadow: anyLive ? `0 0 6px ${allLive ? colors.green : colors.yellow}` : undefined,
            }}
          />
          <span style={{ fontSize: 10, fontFamily: fonts.mono, color: colors.textDim, letterSpacing: '0.04em' }}>
            {anyLive ? `LIVE · ${liveCount}/${totalCount}` : 'OFFLINE'}
          </span>
        </button>

        <span
          aria-label="Wall clock"
          style={{
            fontFamily: fonts.mono,
            fontSize: 10,
            color: colors.textMuted,
            letterSpacing: '0.04em',
            minWidth: 64,
            textAlign: 'right',
          }}
        >
          {fmtClock(now)}
        </span>
      </div>
    </header>
  )
}
