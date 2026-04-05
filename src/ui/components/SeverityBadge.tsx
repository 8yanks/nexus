import type { AlertSeverity } from '@/types'
import { colors, badge as badgeStyle, fonts } from '@/ui/theme'

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  info: colors.cyan,
  warning: colors.yellow,
  critical: colors.red,
}

interface Props {
  severity: AlertSeverity
}

export const SeverityBadge = ({ severity }: Props) => (
  <span
    style={{
      ...badgeStyle,
      color: SEVERITY_COLORS[severity],
      background: `${SEVERITY_COLORS[severity]}18`,
      fontFamily: fonts.mono,
      textTransform: 'uppercase',
    }}
  >
    {severity}
  </span>
)
