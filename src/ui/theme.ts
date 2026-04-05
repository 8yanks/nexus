// ─── NEXUS THEME — TradingView-inspired terminal design ─────
// Dark premium palette, high contrast, mono-spaced numbers,
// clear visual hierarchy, dense but readable.

export const colors = {
  // Backgrounds — layered depth
  bg: '#0a0e17',
  bgCard: '#0f1520',
  bgCardAlt: '#131a2a',
  bgHover: '#1a2236',
  bgTableRow: '#0d111d',
  bgTableRowAlt: '#111827',
  bgInput: '#0c1018',

  // Borders
  border: '#1e293b',
  borderLight: '#253149',
  borderFocus: '#3b82f6',

  // Text hierarchy
  text: '#e2e8f0',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  textDim: '#475569',

  // Accent
  accent: '#3b82f6',
  accentHover: '#2563eb',
  accentDim: '#1e3a8a',

  // Semantic
  green: '#00d4aa',
  greenDim: '#00d4aa22',
  red: '#ff4466',
  redDim: '#ff446622',
  yellow: '#ffaa22',
  yellowDim: '#ffaa2222',
  orange: '#ff6644',
  purple: '#a855f7',
  purpleDim: '#a855f722',
  cyan: '#06b6d4',
  cyanDim: '#06b6d422',

  // Status overlays
  live: '#00d4aa',
  delayed: '#ffaa22',
  simulated: '#a855f7',
  stale: '#ff6644',
  unavailable: '#64748b',
  error: '#ff4466',
} as const

export const fonts = {
  sans: "'IBM Plex Sans', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
} as const

// ─── SHARED STYLES ──────────────────────────────────────────

export const card: React.CSSProperties = {
  background: colors.bgCard,
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  padding: 16,
}

export const cardElevated: React.CSSProperties = {
  ...card,
  boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
}

export const badge: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 600,
  fontFamily: fonts.mono,
  letterSpacing: '0.03em',
}

// Table styles — reusable across screens
export const thStyle: React.CSSProperties = {
  padding: '10px 12px',
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
  padding: '8px 12px',
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
  borderRadius: 4,
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
  borderRadius: 4,
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
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: fonts.sans,
  color: '#fff',
  background: colors.accent,
  transition: 'background 0.15s',
}

// Empty state
export const emptyState: React.CSSProperties = {
  padding: 32,
  textAlign: 'center',
  color: colors.textDim,
  fontSize: 13,
}
