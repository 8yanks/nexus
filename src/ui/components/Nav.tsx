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
import { colors, fonts, radius } from '@/ui/theme'
import {
  CATEGORIES,
  categoryOf,
  landingOf,
  screensForCategory,
} from '@/ui/nav-categories'

// ─── ICON MAP ───────────────────────────────────────────────
// Screen → icon. Centralising it here keeps the secondary subnav
// declarative and shares the same pictograms across categories.
const SCREEN_ICONS: Record<Screen, React.ReactNode> = {
  dashboard:   <LayoutDashboard size={13} />,
  detail:      <LayoutDashboard size={13} />,
  scanner:     <ScanSearch size={13} />,
  correlation: <GitCompareArrows size={13} />,
  macro:       <Globe size={13} />,
  chain:       <Workflow size={13} />,
  sentinel:    <ShieldAlert size={13} />,
  trader:      <Briefcase size={13} />,
  backtest:    <FlaskConical size={13} />,
  quality:     <ShieldCheck size={13} />,
  vcflow:      <Rocket size={13} />,
  corporate:   <Building2 size={13} />,
  alerts:      <Bell size={13} />,
  journal:     <BookOpen size={13} />,
  sources:     <Database size={13} />,
  export:      <Download size={13} />,
  options:     <Settings size={13} />,
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

export const Nav = () => {
  const screen = useMarketStore((s) => s.screen)
  const setScreen = useMarketStore((s) => s.setScreen)
  const binanceConnected = useMarketStore((s) => s.binanceConnected)

  const activeCategory = categoryOf(screen)
  const subscreens = screensForCategory(activeCategory)

  return (
    <div
      style={{
        background: colors.bgCard,
        borderBottom: `1px solid ${colors.border}`,
        fontFamily: fonts.sans,
      }}
    >
      {/* ─── PRIMARY ROW — brand + 5 categories + status ─── */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          padding: '6px 16px',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginRight: 24,
            cursor: 'pointer',
          }}
          onClick={() => setScreen('dashboard')}
        >
          <Activity size={16} style={{ color: colors.accent }} />
          <span
            style={{
              fontWeight: 800,
              fontSize: 14,
              color: colors.accent,
              fontFamily: fonts.mono,
              letterSpacing: '0.12em',
            }}
          >
            NEXUS
          </span>
        </div>

        {/* Category tabs */}
        {CATEGORIES.map((cat) => {
          const isActive = cat.id === activeCategory
          return (
            <button
              key={cat.id}
              onClick={() => {
                if (cat.id !== activeCategory) {
                  setScreen(landingOf(cat.id))
                }
              }}
              data-category={cat.id}
              data-active={isActive ? 'true' : 'false'}
              style={{
                padding: '6px 14px',
                border: 'none',
                borderRadius: radius.btn,
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: fonts.sans,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? colors.text : colors.textMuted,
                background: isActive ? colors.bgHover : 'transparent',
                letterSpacing: '0.02em',
                transition: 'background 0.12s ease, color 0.12s ease',
              }}
            >
              {cat.label}
            </button>
          )
        })}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Analyst Mode badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 10px',
            borderRadius: radius.badge,
            background: colors.bgHover,
            border: `1px solid ${colors.border}`,
            marginRight: 12,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontFamily: fonts.mono,
              fontWeight: 700,
              color: colors.textSecondary,
              letterSpacing: '0.08em',
            }}
          >
            ANALYST MODE
          </span>
        </div>

        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: radius.pill,
              background: binanceConnected ? colors.green : colors.red,
              boxShadow: binanceConnected ? `0 0 6px ${colors.green}` : undefined,
            }}
          />
          <span style={{ fontSize: 10, fontFamily: fonts.mono, color: colors.textDim, letterSpacing: '0.04em' }}>
            {binanceConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </nav>

      {/* ─── SECONDARY ROW — subscreens of active category ─── */}
      {/*
       * Rendered only when the active category has more than one
       * subscreen. Single-screen categories (none today, but possible)
       * would just clutter the chrome with a one-button row.
       */}
      {subscreens.length > 1 && (
        <div
          role="tablist"
          aria-label={`${activeCategory} subscreens`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            padding: '4px 16px 6px',
            borderTop: `1px solid ${colors.border}`,
            background: colors.bg,
          }}
        >
          {subscreens.map((s) => {
            const isActive = screen === s
            return (
              <button
                key={s}
                role="tab"
                aria-selected={isActive}
                onClick={() => setScreen(s)}
                data-screen={s}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  border: 'none',
                  borderRadius: radius.btn,
                  cursor: 'pointer',
                  fontSize: 11,
                  fontFamily: fonts.sans,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? colors.accent : colors.textMuted,
                  background: isActive ? colors.bgHover : 'transparent',
                  borderBottom: isActive
                    ? `2px solid ${colors.accent}`
                    : '2px solid transparent',
                  transition: 'all 0.12s ease',
                }}
              >
                {SCREEN_ICONS[s]}
                {SCREEN_LABELS[s]}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
