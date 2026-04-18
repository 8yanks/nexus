// ─── OPTIONS SCREEN — user customisation hub ────────────────
//
// Single point-of-control for everything personalisable in NEXUS. Built
// during the UX overhaul (Phase 1.4) to consolidate prefs that were
// previously scattered (theme/density via tokens, audit-filter persisted
// per-screen, hotkeys hardcoded).
//
// Sections (in display order):
//   1. Apparence        — theme + density (live-wired via prefs.ts)
//   2. Données          — refresh interval + visible columns (placeholder)
//   3. Notifications    — alert routing (placeholder)
//   4. Layout           — column ordering + panel sizes (placeholder)
//   5. Hotkeys          — read-only list of current shortcuts
//   6. Audit retention  — log lifecycle policy (placeholder)
//   7. Workspaces       — saved layout presets (Phase 1.5)
//   8. Avancé           — debug, telemetry, dev flags (placeholder)
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
  { keys: 'r',      desc: 'Lance la chaîne de décision',    scope: 'Chain monitor' },
  { keys: 'Esc',    desc: 'Ferme la fenêtre de drilldown',   scope: 'Detail / Drilldown' },
  { keys: '⌘ / Ctrl + K', desc: 'Recherche globale (à venir)',     scope: 'Global' },
]

// ─── MAIN ────────────────────────────────────────────────────

export const Options = () => {
  // We don't store these in React state — the setters below trigger a
  // page reload, so the next module-load picks up the persisted value
  // via loadTheme()/loadDensity(). Reads here just bootstrap the toggles.
  const theme = loadTheme()
  const density = loadDensity()

  const themeOptions: readonly SegmentedOption<ThemeName>[] = [
    { value: 'dark',  label: 'Sombre', icon: <Moon size={13} /> },
    { value: 'light', label: 'Clair',  icon: <Sun size={13} /> },
  ]

  const densityOptions: readonly SegmentedOption<DensityName>[] = [
    { value: 'compact',  label: 'Compact'  },
    { value: 'comfy',    label: 'Confort'  },
    { value: 'spacious', label: 'Spacieux' },
  ]

  return (
    <>
      <ScreenHeader
        title="Options"
        subtitle="Réglages globaux de l'interface, des données et du comportement. Les changements de thème et de densité rechargent la page pour réappliquer la palette ; les autres réglages sont appliqués en direct."
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
      {/* 1. APPARENCE — fully wired */}
      <Section
        icon={<Settings size={14} />}
        title="Apparence"
        hint="Thème et densité d'affichage. Persistés dans le navigateur sous nexus.theme.v1 et nexus.density.v1."
      >
        <Row label="Thème" description="Sombre par défaut. Le mode clair utilise une palette inversée avec contrastes AA.">
          <Segmented<ThemeName>
            ariaLabel="Thème de l'interface"
            value={theme}
            options={themeOptions}
            onChange={setTheme}
          />
        </Row>
        <Row label="Densité" description="Échelle des paddings, gaps et hauteurs de ligne. Compact pour les power users, Spacieux pour l'accessibilité.">
          <Segmented<DensityName>
            ariaLabel="Densité d'affichage"
            value={density}
            options={densityOptions}
            onChange={setDensity}
          />
        </Row>
      </Section>

      {/* 2. DONNÉES — placeholder */}
      <Section
        icon={<Database size={14} />}
        title="Données"
        hint="Sources de marché, intervalles de rafraîchissement, colonnes visibles."
      >
        <Placeholder note="À venir — Phase 2. Inclura : intervalle de polling, colonnes affichées dans le scanner, format des prix (USD/USDT), seuils de fraîcheur." />
      </Section>

      {/* 3. NOTIFICATIONS — placeholder */}
      <Section
        icon={<Bell size={14} />}
        title="Notifications"
        hint="Routage des alertes, seuils, canaux de sortie."
      >
        <Placeholder note="À venir — Phase 2. Inclura : seuils de prix, routage vers desktop / e-mail, regroupement des alertes répétées." />
      </Section>

      {/* 4. LAYOUT — placeholder */}
      <Section
        icon={<Layout size={14} />}
        title="Layout"
        hint="Disposition des panels, ordre des colonnes, ce qui est épinglé."
      >
        <Placeholder note="À venir — Phase 2. Inclura : ordre des colonnes du dashboard, panels épinglés en haut, taille de la sidebar de drilldown." />
      </Section>

      {/* 5. HOTKEYS — read-only list */}
      <Section
        icon={<Keyboard size={14} />}
        title="Raccourcis clavier"
        hint="Vue d'ensemble des raccourcis actuellement câblés. La personnalisation arrivera dans une prochaine phase."
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
        title="Rétention de l'audit"
        hint="Cycle de vie des entrées d'audit-log de la chaîne de décision."
      >
        <Placeholder note="À venir — Phase 2. Inclura : nombre maximal d'entrées, age max, purge manuelle, export avant purge." />
      </Section>

      {/* 7. WORKSPACES — wired (Phase 1.5) */}
      <Section
        icon={<LayoutGrid size={14} />}
        title="Workspaces"
        hint="Snapshots nommés de votre combinaison thème + densité. Phase 1.5 ne couvre que ces deux champs ; les filtres et le layout viendront s'y greffer plus tard."
      >
        <WorkspaceManager />
      </Section>

      {/* 8. AVANCÉ — placeholder */}
      <Section
        icon={<Wrench size={14} />}
        title="Avancé"
        hint="Outils de debug, télémétrie, drapeaux expérimentaux."
      >
        <Placeholder note="À venir — Phase 2. Inclura : niveau de log, dump de l'état Zustand, reset complet du localStorage, drapeaux pour activer les screens en dev." />
      </Section>
      </div>
    </>
  )
}
