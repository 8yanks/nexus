import { colors, fonts } from '@/ui/theme'

// Hand-rolled triangle-alert SVG — kept inline rather than importing
// from lucide-react. The banner is mounted on every AI-decision screen,
// so pulling the lucide chunk into the shared bundle would trip the
// per-chunk size budget. 17 lines vs 30 KB of icon-set code.
const AlertTriangleIcon = ({ size = 13, color }: { size?: number; color: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ flexShrink: 0 }}
  >
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
)

// ─── NOT-FINANCIAL-ADVICE BANNER ────────────────────────────
//
// Slim inline banner that goes at the top of any screen showing AI
// decisions, paper trades, or anything a casual reader might mistake
// for actionable financial guidance. The PAPER TRADING badge in the
// TopBar covers the "no real orders" angle; this covers the
// "interpret at your own risk" angle.
//
// Visual: single-line strip with a warning icon, dim yellow accent,
// fits between the ScreenHeader and the screen body. No close button
// — this needs to stay visible every visit. If a future iteration
// wants dismissal, persist it under `nexus_nfa_dismissed` so the
// pattern matches the splash modal.
//
// Used by ChainMonitor, Trader, Sentinel — anywhere AI output drives
// the visible content. NOT used on Dashboard / Detail / Scanner where
// the user is just reading raw market data.

export interface NotFinancialAdviceBannerProps {
  /**
   * Optional context phrase appended to the standard message. e.g.
   * "AI decisions may be miscalibrated" on ChainMonitor, "simulated
   * fills only" on Trader. Keep it under ~60 chars so the banner
   * stays one line on standard widths.
   */
  context?: string
}

export const NotFinancialAdviceBanner = ({
  context,
}: NotFinancialAdviceBannerProps) => (
  <div
    role="note"
    aria-label="This information is not financial advice"
    data-testid="nfa-banner"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 12px',
      margin: '8px 20px 0',
      background: `${colors.yellow}10`,
      border: `1px solid ${colors.yellow}40`,
      borderRadius: 4,
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.textSecondary,
      lineHeight: 1.4,
    }}
  >
    <AlertTriangleIcon size={13} color={colors.yellow} />
    <span>
      <strong style={{ color: colors.yellow, fontWeight: 700, letterSpacing: '0.02em' }}>
        NOT FINANCIAL ADVICE
      </strong>
      {' — '}
      Research and education only. You assume full responsibility for any
      decisions you make based on this output.
      {context && (
        <span style={{ color: colors.textMuted }}>
          {' · '}{context}
        </span>
      )}
    </span>
  </div>
)
