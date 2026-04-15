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
} from 'lucide-react'
import { useMarketStore } from '@/store/market'
import type { Screen } from '@/store/market'
import { colors, fonts } from '@/ui/theme'

interface NavItem {
  screen: Screen
  label: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  { screen: 'dashboard',   label: 'Dashboard',   icon: <LayoutDashboard size={14} /> },
  { screen: 'scanner',     label: 'Scanner',     icon: <ScanSearch size={14} /> },
  { screen: 'alerts',      label: 'Alerts',      icon: <Bell size={14} /> },
  { screen: 'correlation', label: 'Correlation', icon: <GitCompareArrows size={14} /> },
  { screen: 'backtest',    label: 'Backtest',    icon: <FlaskConical size={14} /> },
  { screen: 'corporate',   label: 'Corporate',   icon: <Building2 size={14} /> },
  { screen: 'vcflow',      label: 'VC Flow',     icon: <Rocket size={14} /> },
  { screen: 'macro',       label: 'Macro',       icon: <Globe size={14} /> },
  { screen: 'quality',     label: 'Quality',     icon: <ShieldCheck size={14} /> },
  { screen: 'sources',     label: 'Sources',     icon: <Database size={14} /> },
  { screen: 'journal',     label: 'Journal',     icon: <BookOpen size={14} /> },
  { screen: 'export',      label: 'Export',      icon: <Download size={14} /> },
  { screen: 'chain',       label: 'Chain',       icon: <Workflow size={14} /> },
]

export const Nav = () => {
  const screen = useMarketStore((s) => s.screen)
  const setScreen = useMarketStore((s) => s.setScreen)
  const binanceConnected = useMarketStore((s) => s.binanceConnected)

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        padding: '6px 16px',
        background: colors.bgCard,
        borderBottom: `1px solid ${colors.border}`,
        fontFamily: fonts.sans,
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginRight: 20,
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

      {/* Nav items */}
      {NAV_ITEMS.map((item) => {
        const isActive = screen === item.screen
        return (
          <button
            key={item.screen}
            onClick={() => setScreen(item.screen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: fonts.sans,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? colors.accent : colors.textMuted,
              background: isActive ? `${colors.accent}12` : 'transparent',
              borderBottom: isActive ? `2px solid ${colors.accent}` : '2px solid transparent',
              transition: 'all 0.12s ease',
            }}
          >
            {item.icon}
            {item.label}
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
          borderRadius: 4,
          background: `${colors.cyan}15`,
          border: `1px solid ${colors.cyan}30`,
          marginRight: 12,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontFamily: fonts.mono,
            fontWeight: 700,
            color: colors.cyan,
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
            borderRadius: '50%',
            background: binanceConnected ? colors.green : colors.red,
            boxShadow: binanceConnected ? `0 0 6px ${colors.green}` : undefined,
          }}
        />
        <span style={{ fontSize: 10, fontFamily: fonts.mono, color: colors.textDim, letterSpacing: '0.04em' }}>
          {binanceConnected ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>
    </nav>
  )
}
