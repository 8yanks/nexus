// ─── SCREEN HEADER — standardised top-of-screen chrome ──────
//
// Single component every screen can adopt for: title, optional subtitle,
// optional badge (LIVE/SIM/etc.), optional ⚙ settings button that opens
// a per-screen drawer, optional right-side action slot (Refresh, Export…).
//
// Adoption strategy: opt-in. Existing screens keep their hand-rolled
// headers; new screens (Options) and refonte targets (Phase 3) use this.
// The point is to have ONE place where header padding, font sizes and
// spacing are defined, so a future density change scales every screen.

import { useState } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import { colors, fonts, radius } from '@/ui/theme'
import { ScreenSettings } from './ScreenSettings'

export interface ScreenHeaderProps {
  /** Screen title — short, no punctuation. e.g. "Dashboard" / "Trader". */
  title: string
  /** Optional one-line summary under the title. */
  subtitle?: string
  /**
   * Optional inline badge to the right of the title (e.g. LIVE / SIM /
   * count). Pass any node — it's rendered as-is so the caller controls
   * colour and shape.
   */
  badge?: React.ReactNode
  /** Optional right-side action slot. Buttons, kbd hints, etc. */
  actions?: React.ReactNode
  /**
   * Optional content for the per-screen settings drawer. When provided,
   * a ⚙ button is rendered next to `actions`; clicking it opens the
   * drawer. The drawer is rendered into the same DOM tree (no portal)
   * so it inherits the screen's local context.
   */
  settings?: React.ReactNode
  /** Title for the settings drawer (defaults to "Settings — {title}"). */
  settingsTitle?: string
}

export const ScreenHeader = ({
  title,
  subtitle,
  badge,
  actions,
  settings,
  settingsTitle,
}: ScreenHeaderProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          // v3 handoff: 12px 20px padding on a card-coloured background
          // (instead of bg) so the header reads as a distinct band above
          // the content area.
          padding: '12px 20px',
          borderBottom: `1px solid ${colors.border}`,
          background: colors.bgCard,
          fontFamily: fonts.sans,
        }}
      >
        {/* LEFT — title + subtitle + badge */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: '0.02em',
                color: colors.text,
                whiteSpace: 'nowrap',
              }}
            >
              {title}
            </h1>
            {badge && <div>{badge}</div>}
          </div>
          {subtitle && (
            <p
              style={{
                margin: '3px 0 0',
                fontSize: 11,
                color: colors.textMuted,
                lineHeight: 1.4,
                maxWidth: 600,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* RIGHT — actions + ⚙ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
          }}
        >
          {actions}
          {settings && (
            <button
              type="button"
              aria-label={`Settings — ${title}`}
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen((v) => !v)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                background: drawerOpen ? colors.bgHover : 'transparent',
                border: `1px solid ${colors.border}`,
                borderRadius: radius.btn,
                color: drawerOpen ? colors.text : colors.textSecondary,
                cursor: 'pointer',
                transition: 'background 0.12s ease, color 0.12s ease',
              }}
            >
              <SettingsIcon size={14} />
            </button>
          )}
        </div>
      </header>

      {settings && drawerOpen && (
        <ScreenSettings
          title={settingsTitle ?? `Settings — ${title}`}
          onClose={() => setDrawerOpen(false)}
        >
          {settings}
        </ScreenSettings>
      )}
    </>
  )
}
