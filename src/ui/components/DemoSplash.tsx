import { useState, useEffect } from 'react'
import { colors, fonts } from '@/ui/theme'

// ─── DEMO SPLASH OVERLAY ────────────────────────────────────
// Shown on first load. Explains NEXUS and the 3-bot architecture.
// Press "Enter Dashboard" or Escape to dismiss.

const BOTS = [
  {
    name: 'Analyst',
    tag: 'ACTIVE',
    color: colors.cyan,
    desc: 'Multi-asset market monitoring. 19 instruments, 23 signal types, real-time data with mock fallback.',
    features: ['Crypto, Equities, Forex, Commodities, Indices', 'Technical + Corporate + Macro signals', '16 interactive screens'],
  },
  {
    name: 'Sentinel',
    tag: 'ACTIVE',
    color: colors.yellow,
    desc: 'Risk guardrail. Runs 11 veto rules (drawdown, exposure, data age, model confidence) on every decision before execution.',
    features: ['Rules engine + safe mode toggle', 'Veto reasons + risk metric snapshots', 'Human-review queue for borderline calls'],
  },
  {
    name: 'Trader',
    tag: 'ACTIVE',
    color: colors.purple,
    desc: 'Paper execution. Dry-run only — live trading disabled. Tracks orders, fills, slippage, positions, PnL.',
    features: ['Paper broker with slippage model', 'Open/closed positions + mark-to-market', 'Order blotter with fill rate + PnL'],
  },
]

const PACKAGES = [
  { name: 'shared-types', desc: '7 type modules' },
  { name: 'shared-utils', desc: 'math, format, freshness' },
  { name: 'shared-signals', desc: 'signal configs' },
  { name: 'shared-clients', desc: 'provider base' },
  { name: 'shared-infra', desc: 'health monitor' },
]

export const DemoSplash = ({ onDismiss }: { onDismiss: () => void }) => {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        setVisible(false)
        onDismiss()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onDismiss])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 8, 15, 0.92)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: fonts.sans,
      }}
      onClick={() => { setVisible(false); onDismiss() }}
    >
      <div
        style={{
          maxWidth: 720,
          width: '90vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: colors.bgCard,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          padding: '32px 36px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', color: colors.accent, marginBottom: 6 }}>
            ANALYST MODE
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: colors.text, letterSpacing: '-0.02em' }}>
            NEXUS
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: colors.textSecondary, lineHeight: 1.5 }}>
            Multi-asset market monitoring dashboard.<br />
            Research & analysis only — no live trading.
          </p>
        </div>

        {/* 3-Bot Architecture */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, letterSpacing: '0.1em', marginBottom: 12, textTransform: 'uppercase' }}>
            3-Bot Architecture
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {BOTS.map((bot) => (
              <div
                key={bot.name}
                style={{
                  flex: 1,
                  minWidth: 190,
                  background: colors.bgCardAlt,
                  border: `1px solid ${colors.border}`,
                  borderLeft: `3px solid ${bot.color}`,
                  borderRadius: 8,
                  padding: '14px 16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>{bot.name}</span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: bot.color,
                      background: `${bot.color}18`,
                      padding: '2px 6px',
                      borderRadius: 3,
                      letterSpacing: '0.05em',
                    }}
                  >
                    {bot.tag}
                  </span>
                </div>
                <p style={{ margin: '0 0 8px', fontSize: 11, color: colors.textSecondary, lineHeight: 1.4 }}>
                  {bot.desc}
                </p>
                <ul style={{ margin: 0, padding: '0 0 0 14px', fontSize: 10, color: colors.textMuted, lineHeight: 1.6 }}>
                  {bot.features.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Shared Packages */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, letterSpacing: '0.1em', marginBottom: 8, textTransform: 'uppercase' }}>
            Shared Packages
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PACKAGES.map((pkg) => (
              <span
                key={pkg.name}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: colors.accent,
                  background: `${colors.accent}12`,
                  border: `1px solid ${colors.accent}30`,
                  padding: '4px 10px',
                  borderRadius: 4,
                  fontFamily: fonts.mono,
                }}
                title={pkg.desc}
              >
                @nexus/{pkg.name}
              </span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 28, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { label: 'Instruments', value: '19' },
            { label: 'Signal Types', value: '23' },
            { label: 'Screens', value: '16' },
            { label: 'Tests', value: '652+' },
            { label: 'TS Errors', value: '0' },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: colors.text, fontFamily: fonts.mono }}>{s.value}</div>
              <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Enter button */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => { setVisible(false); onDismiss() }}
            style={{
              padding: '10px 32px',
              fontSize: 13,
              fontWeight: 700,
              color: colors.bg,
              background: colors.accent,
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              letterSpacing: '0.02em',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = colors.accentHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = colors.accent)}
          >
            Enter Dashboard
          </button>
          <div style={{ fontSize: 10, color: colors.textDim, marginTop: 8 }}>
            Press <kbd style={{ fontFamily: fonts.mono, padding: '1px 4px', background: colors.bgCardAlt, borderRadius: 3 }}>Enter</kbd> or <kbd style={{ fontFamily: fonts.mono, padding: '1px 4px', background: colors.bgCardAlt, borderRadius: 3 }}>Esc</kbd> to dismiss
          </div>
        </div>
      </div>
    </div>
  )
}
