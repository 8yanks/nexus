import { useEffect, useState } from 'react'
import { loadConsent, saveConsent, type ConsentState } from '@/ui/consent'
import { colors, fonts } from '@/ui/theme'

// ─── COOKIE CONSENT BANNER ──────────────────────────────────
//
// Bottom-of-page strip that appears only when the user has not yet
// chosen accept/decline (`loadConsent() === 'unset'`). Once a choice
// is made, the banner disappears for good and the choice is stored
// in localStorage.
//
// Today the app uses NO analytics cookies — so this banner is
// dormant by default. It's provisioned now so that:
// 1. Adding Plausible / PostHog / Sentry later is one import + one
//    `if (loadConsent() === 'accepted')` branch.
// 2. The legal posture is correct from day 1: the moment we ship a
//    tracker, the consent surface is already there.
//
// To wire a real consumer (e.g. Plausible):
//   const stop = onConsentChange((s) => {
//     if (s === 'accepted') initPlausible()
//     else teardownPlausible()
//   })
//
// The banner uses a polite tone — no dark patterns. Both buttons
// are visually equivalent (no "accept" pre-styled bigger / brighter)
// per RGPD CNIL guidelines.

export const CookieConsent = () => {
  const [state, setState] = useState<ConsentState>('unset')

  // Load on mount only — the banner reads localStorage exactly once
  // and the only way state changes from there is via the buttons
  // below, so no need to subscribe to onConsentChange here.
  useEffect(() => {
    setState(loadConsent())
  }, [])

  if (state !== 'unset') return null

  const choose = (next: 'accepted' | 'declined') => {
    saveConsent(next)
    setState(next)
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Préférences de confidentialité"
      data-testid="cookie-consent-banner"
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        right: 16,
        maxWidth: 720,
        margin: '0 auto',
        padding: '14px 18px',
        background: colors.bgCard,
        border: `1px solid ${colors.border}`,
        borderRadius: 6,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        fontFamily: fonts.sans,
        color: colors.text,
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ fontSize: 13, lineHeight: 1.55, color: colors.textSecondary }}>
        <strong style={{ color: colors.text, fontWeight: 600 }}>
          Préférences de confidentialité
        </strong>
        <br />
        NEXUS n'utilise actuellement aucun cookie ni traceur de marketing,
        publicité ou analytics. Cette préférence est enregistrée pour le jour
        où une fonctionnalité de mesure d'audience anonyme serait ajoutée
        (Plausible, PostHog auto-hébergé). Vous pouvez la modifier à tout
        moment depuis l'écran <strong>Légal</strong>.
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={() => choose('declined')}
          data-testid="cookie-consent-decline"
          style={{
            padding: '6px 14px',
            fontSize: 12,
            fontFamily: fonts.sans,
            border: `1px solid ${colors.border}`,
            borderRadius: 4,
            background: 'transparent',
            color: colors.textSecondary,
            cursor: 'pointer',
          }}
        >
          Refuser
        </button>
        <button
          type="button"
          onClick={() => choose('accepted')}
          data-testid="cookie-consent-accept"
          style={{
            padding: '6px 14px',
            fontSize: 12,
            fontFamily: fonts.sans,
            border: `1px solid ${colors.accent}`,
            borderRadius: 4,
            background: 'transparent',
            color: colors.accent,
            cursor: 'pointer',
          }}
        >
          Accepter
        </button>
      </div>
    </div>
  )
}
