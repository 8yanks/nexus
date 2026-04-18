// ─── NEXUS THEME — re-export of the active palette ──────────
//
// Single point of truth for `colors`. The values come from the active
// palette in `tokens.ts` (currently dark, with light shipping in the
// next commit via ThemeProvider). The shape is preserved 1:1 with the
// pre-overhaul theme so the 100+ existing call sites that import
// `colors.bg`, `colors.green`, etc. keep working unchanged.
//
// ⚠ Future: when we migrate to live theme switching (no reload), these
// hex strings become CSS var references (`var(--c-bg)` etc.) and the
// active palette is applied via :root. The 31 `${colors.X}NN` opacity
// concatenations need to be migrated to the `alpha()` helper first.
//
// For now: theme switch = persist preference + reload.

import { palettes, fonts as tokenFonts, radius, density } from './tokens'
import type { ThemeName, DensityName } from './tokens'
import { loadTheme, loadDensity } from './prefs'

// Module-load: pick the active palette + density from persisted prefs.
// This runs once before React mounts, so `colors.X` resolves against the
// user's chosen theme immediately. Switching theme writes the new value
// to localStorage and reloads the page; future migration to CSS vars
// will remove the reload.
export const activeThemeName: ThemeName = loadTheme()
export const activeDensityName: DensityName = loadDensity()
const active = palettes[activeThemeName]
export const activeDensity = density[activeDensityName]

// Aliases kept for backwards compatibility with the v1 colour names.
// Each maps onto the new greyscale-layered palette.
export const colors = {
  // Backgrounds — layered depth (darkest → brightest in dark mode)
  bg: active.bg,
  bgCard: active.surface1,
  bgCardAlt: active.surface2,
  bgHover: active.surface3,
  bgTableRow: active.surface1,
  bgTableRowAlt: active.surface2,
  bgInput: active.surface1,

  // Borders
  border: active.border,
  borderLight: active.borderStrong,
  borderFocus: active.info,

  // Text hierarchy
  text: active.text,
  textSecondary: active.textSecondary,
  textMuted: active.textMuted,
  textDim: active.textDim,

  // Accent (brand). In v1 this was cyan/blue — now neutral white in dark
  // mode, so the brand reads as "subtle premium" instead of bleu froid.
  accent: active.accent,
  accentHover: active.accent,
  accentDim: active.accentDim,

  // Semantic — kept under their v1 colour names so existing components
  // don't need to migrate. These ARE the only colourful elements in the
  // greyscale layered theme.
  green: active.success,
  greenDim: active.successDim,
  red: active.danger,
  redDim: active.dangerDim,
  yellow: active.warn,
  yellowDim: active.warnDim,
  orange: active.stale,
  purple: active.simulated,
  purpleDim: active.simulated,
  cyan: active.info,
  cyanDim: active.infoDim,

  // Status overlays
  live: active.live,
  delayed: active.delayed,
  simulated: active.simulated,
  stale: active.stale,
  unavailable: active.unavailable,
  error: active.error,
} as const

export const fonts = tokenFonts

// Re-export tokens v2 so call sites can adopt them progressively.
export { radius, density, palettes }
export type { ThemeName, DensityName }

// ─── SHARED STYLES ──────────────────────────────────────────
// Ported to v2 radius + density tokens. Card padding and table cell
// vertical paddings now read from `activeDensity`, so a single switch
// in Options → Apparence → Densité rescales every card / table row at
// module-load. Buttons keep fixed paddings (interaction elements, not
// layout); the badge keeps its tight 2/8 padding for visual contrast
// with table cells. Font sizes will follow density in a later commit
// once the type scale is locked in.

export const card: React.CSSProperties = {
  background: colors.bgCard,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.card,
  padding: activeDensity.padCard,
}

export const cardElevated: React.CSSProperties = {
  ...card,
  boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
}

export const badge: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: radius.badge,
  fontSize: 11,
  fontWeight: 600,
  fontFamily: fonts.mono,
  letterSpacing: '0.03em',
}

// Table styles — reusable across screens. Vertical padding tracks
// density.padPanel so denser layouts feel uniformly tighter; horizontal
// padding stays fixed at 12 because columns are sized by content, not
// density.
export const thStyle: React.CSSProperties = {
  padding: `${activeDensity.padPanel}px 12px`,
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 600,
  color: colors.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  borderBottom: `2px solid ${colors.border}`,
  whiteSpace: 'nowrap',
  position: 'sticky',
  top: 0,
  background: colors.bgCard,
  zIndex: 1,
}

export const tdStyle: React.CSSProperties = {
  padding: `${Math.max(activeDensity.padPanel - 2, 4)}px 12px`,
  fontSize: 13,
  borderBottom: `1px solid ${colors.border}`,
  color: colors.text,
  whiteSpace: 'nowrap',
}

export const monoTd: React.CSSProperties = {
  ...tdStyle,
  fontFamily: fonts.mono,
  fontWeight: 500,
  letterSpacing: '-0.01em',
}

// Section header
export const sectionHeader: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: colors.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 8,
  paddingBottom: 6,
  borderBottom: `1px solid ${colors.border}`,
}

// Stat label / value pair
export const statLabel: React.CSSProperties = {
  fontSize: 10,
  color: colors.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 2,
}

export const statValue: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  fontFamily: fonts.mono,
  color: colors.text,
  letterSpacing: '-0.01em',
}

// Input style (terminal look)
export const inputStyle: React.CSSProperties = {
  background: colors.bgInput,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.input,
  padding: '6px 10px',
  color: colors.text,
  fontFamily: fonts.mono,
  fontSize: 12,
  width: '100%',
  outline: 'none',
  transition: 'border-color 0.15s',
}

// Tag / chip
export const tagStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '3px 8px',
  borderRadius: radius.badge,
  fontSize: 11,
  fontWeight: 600,
  fontFamily: fonts.mono,
  letterSpacing: '0.02em',
}

// Button primary
export const btnPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '8px 16px',
  border: 'none',
  borderRadius: radius.btn,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: fonts.sans,
  color: colors.bg,
  background: colors.accent,
  transition: 'background 0.15s',
}

// Button secondary — outlined ghost (medium). Used for Clear, Export, etc.
// Pair with `style={{ ...btnSecondary }}` and override individual fields
// (e.g. `opacity` when disabled) at the call site.
export const btnSecondary: React.CSSProperties = {
  background: 'transparent',
  color: colors.textSecondary,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.btn,
  padding: '6px 12px',
  cursor: 'pointer',
  fontFamily: fonts.sans,
  fontSize: 12,
}

// Button secondary — compact mono variant. Used for inline row actions
// (close position, accept/dismiss review). Default border + textSecondary
// colors are overridable for semantic variants (green for "accept" etc.).
export const btnSmall: React.CSSProperties = {
  background: 'transparent',
  border: `1px solid ${colors.border}`,
  color: colors.textSecondary,
  borderRadius: radius.badge,
  padding: '1px 8px',
  fontSize: 10,
  cursor: 'pointer',
  fontFamily: fonts.mono,
}

// Empty state
export const emptyState: React.CSSProperties = {
  padding: 32,
  textAlign: 'center',
  color: colors.textDim,
  fontSize: 13,
}
