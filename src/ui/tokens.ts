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

// Dark — true black background, layered greys, sharp semantic accents.
// The deeper the layer, the lighter the grey. This way every nested
// panel can stack one level brighter than its parent without ambiguity.
export const dark: Palette = {
  bg: '#000000',
  surface1: '#0c0c0c',
  surface2: '#161616',
  surface3: '#1f1f1f',
  border: '#262626',
  borderStrong: '#3a3a3a',

  textDim: '#525252',
  textMuted: '#737373',
  textSecondary: '#a3a3a3',
  text: '#fafafa',

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
  unavailable: '#737373',
  error: '#ef4444',

  accent: '#fafafa',
  accentDim: '#fafafa18',
}

// Light — true white background, inverted greyscale ladder, slightly
// darker semantic colours so they read on white (e.g. success goes
// 22c55e → 16a34a for AA contrast).
export const light: Palette = {
  bg: '#ffffff',
  surface1: '#fafafa',
  surface2: '#f4f4f5',
  surface3: '#e4e4e7',
  border: '#d4d4d8',
  borderStrong: '#a1a1aa',

  textDim: '#a1a1aa',
  textMuted: '#71717a',
  textSecondary: '#52525b',
  text: '#0a0a0a',

  success: '#16a34a',
  successDim: '#16a34a18',
  danger: '#dc2626',
  dangerDim: '#dc262618',
  warn: '#d97706',
  warnDim: '#d9770618',
  info: '#2563eb',
  infoDim: '#2563eb18',

  live: '#16a34a',
  delayed: '#d97706',
  simulated: '#7c3aed',
  stale: '#ea580c',
  unavailable: '#71717a',
  error: '#dc2626',

  accent: '#0a0a0a',
  accentDim: '#0a0a0a18',
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
    fontBody: 12,
    fontHeader: 11,
  },
  spacious: {
    padCard: 20,
    padPanel: 14,
    gap: 14,
    rowH: 36,
    fontBody: 13,
    fontHeader: 12,
  },
} as const

export type DensityName = keyof typeof density

export const fonts = {
  sans: "'IBM Plex Sans', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
} as const
