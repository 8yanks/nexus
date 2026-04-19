// ─── SCREEN SETTINGS — drawer that holds per-screen config ──
//
// Inline drawer (NOT a modal): drops in below the ScreenHeader, pushes
// the content down. Chosen over a modal so the user can keep watching
// the screen state while tweaking. Less intrusive on small panels too.
//
// Closed by:
//   - the X button
//   - the Escape key (handled here so the drawer owns the key while open)
//   - re-clicking the ⚙ in ScreenHeader (handled by the parent's toggle)

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { colors, fonts, radius } from '@/ui/theme'

export interface ScreenSettingsProps {
  title: string
  onClose: () => void
  children: React.ReactNode
}

export const ScreenSettings = ({
  title,
  onClose,
  children,
}: ScreenSettingsProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null)

  // Close on Escape — but only when we own the focus (avoid stealing
  // Escape from a deeper modal that might open later).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // If a deeper element has focus and consumes Escape itself, leave
      // it alone. We only act when focus is inside our drawer or on body.
      const active = document.activeElement
      if (
        rootRef.current &&
        active &&
        rootRef.current.contains(active)
      ) {
        e.stopPropagation()
        onClose()
      } else if (active === document.body || active === null) {
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <section
      ref={rootRef}
      role="region"
      aria-label={title}
      style={{
        padding: '14px 24px 16px',
        background: colors.bgCard,
        borderBottom: `1px solid ${colors.border}`,
        fontFamily: fonts.sans,
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: colors.textMuted,
            textTransform: 'uppercase',
          }}
        >
          {title}
        </h2>
        <button
          type="button"
          aria-label="Close settings"
          onClick={onClose}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            background: 'transparent',
            border: 'none',
            borderRadius: radius.btn,
            color: colors.textMuted,
            cursor: 'pointer',
          }}
        >
          <X size={14} />
        </button>
      </header>
      <div style={{ color: colors.text, fontSize: 12, lineHeight: 1.5 }}>
        {children}
      </div>
    </section>
  )
}
