import type { DataStatus } from '@/types'
import { colors, fonts } from '@/ui/theme'

const STATUS_CONFIG: Record<DataStatus, { color: string; bg: string; dot: boolean }> = {
  LIVE:        { color: colors.live,        bg: `${colors.live}18`,        dot: true },
  DELAYED:     { color: colors.delayed,     bg: `${colors.delayed}18`,     dot: false },
  SIMULATED:   { color: colors.simulated,   bg: `${colors.simulated}18`,   dot: false },
  STALE:       { color: colors.stale,       bg: `${colors.stale}18`,       dot: false },
  UNAVAILABLE: { color: colors.unavailable, bg: `${colors.unavailable}18`, dot: false },
  ERROR:       { color: colors.error,       bg: `${colors.error}18`,       dot: false },
}

interface Props {
  status: DataStatus
}

export const StatusBadge = ({ status }: Props) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.UNAVAILABLE
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 7px',
        borderRadius: 3,
        fontSize: 10,
        fontWeight: 700,
        fontFamily: fonts.mono,
        letterSpacing: '0.04em',
        color: cfg.color,
        background: cfg.bg,
      }}
    >
      {cfg.dot && (
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: cfg.color,
            boxShadow: `0 0 4px ${cfg.color}`,
          }}
        />
      )}
      {status}
    </span>
  )
}
