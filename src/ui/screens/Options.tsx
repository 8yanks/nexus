// ─── OPTIONS SCREEN — user customisation hub ────────────────
//
// Single point-of-control for everything personalisable in NEXUS. Built
// during the UX overhaul (Phase 1.4) to consolidate prefs that were
// previously scattered (theme/density via tokens, audit-filter persisted
// per-screen, hotkeys hardcoded).
//
// Sections (in display order):
//   1. Appearance       — theme + density (live-wired via prefs.ts)
//   2. Data             — refresh interval + visible columns (placeholder)
//   3. Notifications    — alert routing (placeholder)
//   4. Layout           — column ordering + panel sizes (placeholder)
//   5. Hotkeys          — read-only list of current shortcuts
//   6. Audit retention  — log lifecycle policy (placeholder)
//   7. Workspaces       — saved layout presets (Phase 1.5)
//   8. Advanced         — debug, telemetry, dev flags (placeholder)
//
// Sections marked "placeholder" render a labelled stub with a one-line
// note about what they'll do when wired up. The chrome (section header,
// description, future cards) is locked in so later commits can fill the
// body without re-laying-out the screen.

import {
  Sun,
  Moon,
  Settings,
  Database,
  Bell,
  Layout,
  Keyboard,
  ScrollText,
  LayoutGrid,
  Wrench,
} from 'lucide-react'
import {
  loadTheme,
  loadDensity,
  setTheme,
  setDensity,
} from '@/ui/prefs'
import type { ThemeName, DensityName } from '@/ui/tokens'
import { colors, fonts, radius, card, sectionHeader } from '@/ui/theme'
import { ScreenHeader } from '@/ui/components/ScreenHeader'
import { WorkspaceManager } from '@/ui/components/WorkspaceManager'

// ─── ROW HELPERS ────────────────────────────────────────────

interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: React.ReactNode
}

interface SegmentedProps<T extends string> {
  value: T
  options: readonly SegmentedOption<T>[]
  onChange: (next: T) => void
  ariaLabel: string
}

/**
 * Segmented control. Used for theme + density toggles. The active option
 * gets a subtle filled background; inactive options stay transparent.
 * Each option is a real <button> with `aria-pressed` so it's focusable
 * and accessible without us having to roll a custom radio group.
 */
const Segmented = <T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: SegmentedProps<T>) => (
  <div
    role="group"
    aria-label={ariaLabel}
    style={{
      display: 'inline-flex',
      gap: 2,
      padding: 2,
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.btn,
    }}
  >
    {options.map((opt) => {
      const isActive = opt.value === value
      return (
        <button
          key={opt.value}
          type="button"
          aria-pressed={isActive}
          onClick={() => {
            if (!isActive) onChange(opt.value)
          }}
          data-value={opt.value}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            border: 'none',
            borderRadius: radius.badge,
            cursor: isActive ? 'default' : 'pointer',
            fontFamily: fonts.sans,
            fontSize: 12,
            fontWeight: isActive ? 600 : 400,
            color: isActive ? colors.text : colors.textMuted,
            background: isActive ? colors.bgHover : 'transparent',
            transition: 'background 0.12s ease, color 0.12s ease',
          }}
        >
          {opt.icon}
          {opt.label}
        </button>
      )
    })}
  </div>
)

// ─── SECTION SHELL ──────────────────────────────────────────

interface SectionProps {
  icon: React.ReactNode
  title: string
  hint?: string
  children: React.ReactNode
}

const Section = ({ icon, title, hint, children }: SectionProps) => (
  <section style={{ ...card, marginBottom: 14 }}>
    <header style={{ ...sectionHeader, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: colors.textSecondary }}>{icon}</span>
      <span>{title}</span>
    </header>
    {hint && (
      <p
        style={{
          margin: '0 0 12px',
          fontSize: 12,
          color: colors.textMuted,
          fontFamily: fonts.sans,
          lineHeight: 1.5,
        }}
      >
        {hint}
      </p>
    )}
    {children}
  </section>
)

// Two-column row for an option label + control. Left column wraps,
// right column stays sized to its content so segmented controls don't
// stretch awkwardly on wide screens.
interface RowProps {
  label: string
  description?: string
  children: React.ReactNode
}

const Row = ({ label, description, children }: RowProps) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 24,
      padding: '10px 0',
      borderBottom: `1px solid ${colors.border}`,
    }}
  >
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: colors.text }}>{label}</div>
      {description && (
        <div
          style={{
            fontSize: 11,
            color: colors.textMuted,
            marginTop: 2,
            fontFamily: fonts.sans,
            lineHeight: 1.4,
          }}
        >
          {description}
        </div>
      )}
    </div>
    <div style={{ flexShrink: 0 }}>{children}</div>
  </div>
)

// Stub renderer for sections that aren't fully wired yet. Keeps the
// chrome consistent so the page already feels finished.
const Placeholder = ({ note }: { note: string }) => (
  <div
    style={{
      padding: '12px 14px',
      borderRadius: radius.input,
      background: colors.bg,
      border: `1px dashed ${colors.border}`,
      fontSize: 12,
      color: colors.textMuted,
      fontFamily: fonts.sans,
      lineHeight: 1.5,
    }}
  >
    {note}
  </div>
)

// ─── HOTKEYS — current bindings (read-only for now) ─────────
// The full keymap will move into a hotkeys store in a later phase.
// Keeping it local + small here documents what's already wired so users
// can discover shortcuts from one place.
const HOTKEYS: { keys: string; desc: string; scope: string }[] = [
  { keys: 'r',      desc: 'Run the decision chain',         scope: 'Chain monitor' },
  { keys: 'Esc',    desc: 'Close the drilldown window',     scope: 'Detail / Drilldown' },
  { keys: '⌘ / Ctrl + K', desc: 'Global search (coming soon)', scope: 'Global' },
]

// ─── MAIN ────────────────────────────────────────────────────

export const Options = () => {
  // We don't store these in React state — the setters below trigger a
  // page reload, so the next module-load picks up the persisted value
  // via loadTheme()/loadDensity(). Reads here just bootstrap the toggles.
  const theme = loadTheme()
  const density = loadDensity()

  const themeOptions: readonly SegmentedOption<ThemeName>[] = [
    { value: 'dark',  label: 'Dark',  icon: <Moon size={13} /> },
    { value: 'light', label: 'Light', icon: <Sun size={13} /> },
  ]

  const densityOptions: readonly SegmentedOption<DensityName>[] = [
    { value: 'compact',  label: 'Compact'  },
    { value: 'comfy',    label: 'Comfy'    },
    { value: 'spacious', label: 'Spacious' },
  ]

  return (
    <>
      <ScreenHeader
        title="Options"
        subtitle="Global settings for the interface, data, and behaviour. Theme and density changes reload the page to reapply the palette; everything else applies live."
      />
      <div
        style={{
          padding: '18px 24px',
          maxWidth: 920,
          margin: '0 auto',
          fontFamily: fonts.sans,
          color: colors.text,
        }}
      >
      {/* 1. APPEARANCE — fully wired */}
      <Section
        icon={<Settings size={14} />}
        title="Appearance"
        hint="Theme and display density. Persisted in the browser under nexus.theme.v1 and nexus.density.v1."
      >
        <Row label="Theme" description="Dark by default. Light mode uses an inverted palette with AA contrast.">
          <Segmented<ThemeName>
            ariaLabel="Interface theme"
            value={theme}
            options={themeOptions}
            onChange={setTheme}
          />
        </Row>
        <Row label="Density" description="Scales paddings, gaps, and row heights. Compact for power users, Spacious for accessibility.">
          <Segmented<DensityName>
            ariaLabel="Display density"
            value={density}
            options={densityOptions}
            onChange={setDensity}
          />
        </Row>
      </Section>

      {/* 2. DATA — placeholder */}
      <Section
        icon={<Database size={14} />}
        title="Data"
        hint="Market sources, refresh intervals, visible columns."
      >
        <Placeholder note="Coming in Phase 2. Will include: polling interval, scanner column visibility, price format (USD/USDT), freshness thresholds." />
      </Section>

      {/* 3. NOTIFICATIONS — placeholder */}
      <Section
        icon={<Bell size={14} />}
        title="Notifications"
        hint="Alert routing, thresholds, output channels."
      >
        <Placeholder note="Coming in Phase 2. Will include: price thresholds, desktop / e-mail routing, deduping of repeated alerts." />
      </Section>

      {/* 4. LAYOUT — placeholder */}
      <Section
        icon={<Layout size={14} />}
        title="Layout"
        hint="Panel arrangement, column ordering, what stays pinned."
      >
        <Placeholder note="Coming in Phase 2. Will include: dashboard column ordering, top-pinned panels, drilldown sidebar width." />
      </Section>

      {/* 5. HOTKEYS — read-only list */}
      <Section
        icon={<Keyboard size={14} />}
        title="Keyboard shortcuts"
        hint="Overview of the shortcuts currently wired up. Customisation arrives in a later phase."
      >
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {HOTKEYS.map((h) => (
            <li
              key={h.keys}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                padding: '8px 0',
                borderBottom: `1px solid ${colors.border}`,
              }}
            >
              <div>
                <div style={{ fontSize: 13, color: colors.text }}>{h.desc}</div>
                <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{h.scope}</div>
              </div>
              <kbd
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: radius.badge,
                  background: colors.bgHover,
                  border: `1px solid ${colors.border}`,
                  color: colors.textSecondary,
                  whiteSpace: 'nowrap',
                }}
              >
                {h.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </Section>

      {/* 6. AUDIT RETENTION — placeholder */}
      <Section
        icon={<ScrollText size={14} />}
        title="Audit retention"
        hint="Lifecycle policy for decision-chain audit-log entries."
      >
        <Placeholder note="Coming in Phase 2. Will include: max entries, max age, manual purge, export-before-purge." />
      </Section>

      {/* 7. WORKSPACES — wired (Phase 1.5) */}
      <Section
        icon={<LayoutGrid size={14} />}
        title="Workspaces"
        hint="Named snapshots of your theme + density combo. Phase 1.5 only covers those two fields; filters and layout will graft on later."
      >
        <WorkspaceManager />
      </Section>

      {/* 8. ADVANCED — placeholder */}
      <Section
        icon={<Wrench size={14} />}
        title="Advanced"
        hint="Debug tooling, telemetry, experimental flags."
      >
        <Placeholder note="Coming in Phase 2. Will include: log level, Zustand state dump, full localStorage reset, dev-only screen flags." />
      </Section>
      </div>
    </>
  )
}
