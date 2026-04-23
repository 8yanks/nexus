import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  ScanSearch,
  Bell,
  ShieldCheck,
  Database,
  Download,
  BookOpen,
  GitCompareArrows,
  FlaskConical,
  Activity,
  Building2,
  Rocket,
  Globe,
  Workflow,
  ShieldAlert,
  Briefcase,
  Settings,
} from 'lucide-react'
import { useMarketStore } from '@/store/market'
import type { Screen } from '@/store/market'
import { colors, fonts } from '@/ui/theme'
import { CATEGORIES } from '@/ui/nav-categories'

// ─── SIDEBAR — vertical collapsible navigation ──────────────
//
// Replaces the old horizontal Nav (`Nav.tsx`) with a TradingView-/
// Hyperliquid-style left rail. Two modes:
//
//   • expanded (192px) — shows category headers + icon + label
//   • collapsed  (52px) — icon-only, with `title` tooltips
//
// The collapsed state persists to localStorage as
// `nexus_sidebar_collapsed` so the user's preference survives reload.
//
// Click on the brand mark toggles collapse. The bottom strip shows
// "X/Y LIVE" and routes to Sources, mirroring the old TopBar's live
// indicator.
//
// Categories + screens come from `nav-categories.ts` (single source
// of truth shared with the TopBar's title resolver). Icons + labels
// live next to the component because they're presentation, not
// navigation logic.

const SCREEN_ICONS: Record<Screen, React.ReactNode> = {
  dashboard:   <LayoutDashboard size={14} />,
  detail:      <LayoutDashboard size={14} />,
  scanner:     <ScanSearch size={14} />,
  correlation: <GitCompareArrows size={14} />,
  macro:       <Globe size={14} />,
  chain:       <Workflow size={14} />,
  sentinel:    <ShieldAlert size={14} />,
  trader:      <Briefcase size={14} />,
  backtest:    <FlaskConical size={14} />,
  quality:     <ShieldCheck size={14} />,
  vcflow:      <Rocket size={14} />,
  corporate:   <Building2 size={14} />,
  alerts:      <Bell size={14} />,
  journal:     <BookOpen size={14} />,
  sources:     <Database size={14} />,
  export:      <Download size={14} />,
  options:     <Settings size={14} />,
}

const SCREEN_LABELS: Record<Screen, string> = {
  dashboard:   'Dashboard',
  detail:      'Detail',
  scanner:     'Scanner',
  correlation: 'Correlation',
  macro:       'Macro',
  chain:       'Chain',
  sentinel:    'Sentinel',
  trader:      'Trader',
  backtest:    'Backtest',
  quality:     'Quality',
  vcflow:      'VC Flow',
  corporate:   'Corporate',
  alerts:      'Alerts',
  journal:     'Journal',
  sources:     'Sources',
  export:      'Export',
  options:     'Options',
}

const COLLAPSE_KEY = 'nexus_sidebar_collapsed'

const loadCollapsed = (): boolean => {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}
const saveCollapsed = (v: boolean) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0')
  } catch {
    /* swallow — storage may be disabled */
  }
}

export const Sidebar = () => {
  const screen = useMarketStore((s) => s.screen)
  const setScreen = useMarketStore((s) => s.setScreen)
  const binanceConnected = useMarketStore((s) => s.binanceConnected)
  const coinbaseConnected = useMarketStore((s) => s.coinbaseConnected)
  const krakenConnected = useMarketStore((s) => s.krakenConnected)

  const [collapsed, setCollapsed] = useState<boolean>(() => loadCollapsed())
  useEffect(() => {
    saveCollapsed(collapsed)
  }, [collapsed])

  const providerStates = [
    { id: 'binance',  connected: binanceConnected  },
    { id: 'coinbase', connected: coinbaseConnected },
    { id: 'kraken',   connected: krakenConnected   },
  ]
  const liveCount = providerStates.filter((p) => p.connected).length
  const totalCount = providerStates.length
  const allLive = liveCount === totalCount
  const anyLive = liveCount > 0

  const liveTooltip = providerStates
    .map((p) => `${p.id}: ${p.connected ? 'connected' : 'offline'}`)
    .join('\n')

  const width = collapsed ? 52 : 192

  return (
    <aside
      aria-label="Primary navigation"
      style={{
        width,
        flexShrink: 0,
        background: colors.bgCard,
        borderRight: `1px solid ${colors.border}`,
        fontFamily: fonts.sans,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        transition: 'width 0.18s ease',
        overflow: 'hidden',
      }}
    >
      {/* ─── BRAND / TOGGLE ─── */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          height: 46,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: collapsed ? 0 : '0 14px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          background: 'transparent',
          border: 'none',
          borderBottom: `1px solid ${colors.border}`,
          cursor: 'pointer',
          color: colors.accent,
          flexShrink: 0,
        }}
      >
        <Activity size={16} style={{ color: colors.accent }} />
        {!collapsed && (
          <span
            style={{
              fontWeight: 800,
              fontSize: 13,
              color: colors.accent,
              fontFamily: fonts.mono,
              letterSpacing: '0.14em',
            }}
          >
            NEXUS
          </span>
        )}
      </button>

      {/* ─── NAV GROUPS ─── */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '6px 0',
        }}
      >
        {CATEGORIES.map((cat) => (
          <div key={cat.id} role="group" aria-label={cat.label} style={{ marginBottom: 6 }}>
            {!collapsed && (
              <div
                style={{
                  padding: '8px 14px 4px',
                  fontSize: 9.5,
                  fontWeight: 700,
                  color: colors.textDim,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                {cat.label}
              </div>
            )}
            {cat.screens.map((s) => {
              const isActive = screen === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScreen(s)}
                  data-screen={s}
                  data-active={isActive ? 'true' : 'false'}
                  aria-current={isActive ? 'page' : undefined}
                  title={collapsed ? SCREEN_LABELS[s] : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: collapsed ? 0 : 10,
                    width: '100%',
                    padding: collapsed ? '7px 0' : '7px 12px',
                    paddingLeft: isActive && !collapsed ? 10 : (collapsed ? 0 : 12),
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    background: isActive ? colors.accentDim : 'transparent',
                    border: 'none',
                    borderLeft: isActive
                      ? `2px solid ${colors.accent}`
                      : '2px solid transparent',
                    color: isActive ? colors.accent : colors.textMuted,
                    cursor: 'pointer',
                    fontSize: 12.5,
                    fontFamily: fonts.sans,
                    fontWeight: isActive ? 600 : 500,
                    textAlign: 'left',
                    transition: 'background 0.12s ease, color 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = colors.bgHover
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                  }}
                >
                  <span style={{ display: 'inline-flex', flexShrink: 0 }}>{SCREEN_ICONS[s]}</span>
                  {!collapsed && <span>{SCREEN_LABELS[s]}</span>}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* ─── BOTTOM STATUS — live providers ─── */}
      <button
        type="button"
        onClick={() => setScreen('sources')}
        aria-label={`${liveCount} of ${totalCount} market-data providers connected. Open Sources.`}
        title={`Market-data providers (click to open Sources):\n${liveTooltip}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: collapsed ? 0 : 8,
          padding: collapsed ? '10px 0' : '10px 14px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          background: 'transparent',
          border: 'none',
          borderTop: `1px solid ${colors.border}`,
          cursor: 'pointer',
          flexShrink: 0,
          color: colors.textDim,
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
            flexShrink: 0,
          }}
        />
        {!collapsed && (
          <span
            style={{
              fontSize: 10,
              fontFamily: fonts.mono,
              letterSpacing: '0.06em',
              color: colors.textDim,
            }}
          >
            {anyLive ? `${liveCount}/${totalCount} LIVE` : 'OFFLINE'}
          </span>
        )}
      </button>
    </aside>
  )
}
