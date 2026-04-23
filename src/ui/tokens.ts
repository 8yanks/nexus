// ─── NEXUS DESIGN TOKENS — v2 (greyscale layered) ───────────
//
// Source of truth for the post-overhaul design system. Two palettes
// (dark + light), gradiated radius, density tokens, font stacks.
//
// Philosophy:
// - Hierarchy is carried by NEUTRALS (5+ greyscale layers) rather than
//   by colour. The only coloured elements are SEMANTIC: success/danger/
//   warn/info, plus the "live/delayed/stale" status family.
// - Border-radius is gradiated by element "weight": pills round, modals
//   gentle, badges crisp. Each token has a single role — never reuse a
//   `r.btn` value on a card; the contrast IS the hierarchy.
// - Density tokens live next to the palette so a single switch in the
//   theme provider can rescale every panel/table without per-component
//   work.
//
// `theme.ts` exports a `colors` object that re-exports the *active*
// palette as flat hex strings, so the existing 100+ callsites that do
// `colors.bg` / `colors.green` keep working unchanged. Theme/density
// toggles live in `theme-provider.tsx` and persist to localStorage.

export interface Palette {
  // Greyscale (darkest → lightest in dark, lightest → darkest in light)
  bg: string
  surface1: string
  surface2: string
  surface3: string
  border: string
  borderStrong: string

  // Text (most muted → most prominent)
  textDim: string
  textMuted: string
  textSecondary: string
  text: string

  // Semantic — visible in both modes, slight tonal shift between them
  success: string
  successDim: string
  danger: string
  dangerDim: string
  warn: string
  warnDim: string
  info: string
  infoDim: string

  // Status family (legacy aliases — most map to semantic above)
  live: string
  delayed: string
  simulated: string
  stale: string
  unavailable: string
  error: string

  // Accent (used sparingly: nav active, brand, focus ring)
  accent: string
  accentDim: string
}

// Dark — soft slate background à la TradingView/Hyperliquid, layered
// neutral-blue greys, sharp semantic accents. The deeper the layer, the
// lighter the surface — every nested panel can stack one level brighter
// than its parent without ambiguity. Backgrounds carry a subtle
// blue-grey hue (≈ #131722 family) instead of pure black: easier on the
// eyes during long sessions and more obviously "professional" than
// pitch-black.
export const dark: Palette = {
  bg: '#0d1117',
  surface1: '#151a22',
  surface2: '#1c222d',
  surface3: '#252b38',
  border: '#2a313e',
  borderStrong: '#3d4555',

  // Text gets a meaningful boost at every tier so labels and table cells
  // pop instead of fading into the surface.
  textDim: '#64748b',
  textMuted: '#94a3b8',
  textSecondary: '#cbd5e1',
  text: '#f1f5f9',

  success: '#22c55e',
  successDim: '#22c55e22',
  danger: '#ef4444',
  dangerDim: '#ef444422',
  warn: '#f59e0b',
  warnDim: '#f59e0b22',
  info: '#3b82f6',
  infoDim: '#3b82f622',

  live: '#22c55e',
  delayed: '#f59e0b',
  simulated: '#a855f7',
  stale: '#f97316',
  unavailable: '#94a3b8',
  error: '#ef4444',

  accent: '#f1f5f9',
  accentDim: '#f1f5f918',
}

// Light — warm-neutral "paper" palette per the v3 design handoff.
// Background drifts off-white toward a pale beige (#f8f7f5) and the
// neutral ladder warms with it (#dbd8d3 borders, #a89f94 dim text).
// Semantic colours are slightly dustier than the dark palette so they
// sit comfortably on the warm background instead of vibrating against
// it: success/danger pull a touch of brown, info shifts from sky-blue
// to a deeper editorial blue used as the accent.
export const light: Palette = {
  bg: '#f8f7f5',
  surface1: '#ffffff',
  surface2: '#f2f1ef',
  surface3: '#e9e7e3',
  border: '#dbd8d3',
  borderStrong: '#c2bdb6',

  textDim: '#a89f94',
  textMuted: '#7a7166',
  textSecondary: '#4a4338',
  text: '#1e1a14',

  success: '#1e7e5a',
  successDim: '#1e7e5a18',
  danger: '#c0392b',
  dangerDim: '#c0392b18',
  warn: '#b86e00',
  warnDim: '#b86e0018',
  info: '#2c5fad',
  infoDim: '#2c5fad18',

  live: '#1e7e5a',
  delayed: '#b86e00',
  simulated: '#6d42b8',
  stale: '#c95c1a',
  unavailable: '#a89f94',
  error: '#c0392b',

  // In light mode the accent is the editorial blue, used for the nav
  // active bar, focus ring, and the brand mark in the sidebar.
  accent: '#2c5fad',
  accentDim: '#2c5fad18',
}

export const palettes = { dark, light } as const
export type ThemeName = keyof typeof palettes

// ─── RADIUS — gradiated by element "weight" ─────────────────
// The more "important" or larger the surface, the rounder it is.
// Pills/badges full-round → buttons square-ish → cards/modals soft.
export const radius = {
  pill: 9999, // tags, status pills, kbd
  badge: 3, // dense badges
  btn: 4, // primary/secondary buttons
  input: 6, // text inputs, selects
  card: 10, // section panels
  modal: 14, // overlays, dialogues
} as const

// ─── DENSITY — drives padding, gap, font-size everywhere ────
// Switching density rescales every layout-bearing token at once.
// Default is "comfy". Compact for power users, spacious for accessibility.
export const density = {
  compact: {
    padCard: 8,
    padPanel: 6,
    gap: 6,
    rowH: 24,
    fontBody: 11,
    fontHeader: 10,
  },
  comfy: {
    padCard: 14,
    padPanel: 10,
    gap: 10,
    rowH: 30,
    fontBody: 13,
    fontHeader: 12,
  },
  spacious: {
    padCard: 20,
    padPanel: 14,
    gap: 14,
    rowH: 36,
    fontBody: 14,
    fontHeader: 13,
  },
} as const

export type DensityName = keyof typeof density

export const fonts = {
  sans: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
} as const
