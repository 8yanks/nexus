import { colors, fonts } from '@/ui/theme'
import { isValidNumber } from '@/utils/math'

interface Props {
  change: number | null
  format?: 'pct' | 'abs'
  fontSize?: number
  /** Optional small suffix (e.g. "24h") rendered inside the badge. Makes
   *  the measurement window explicit so the figure isn't mistakenly read
   *  as "today" when it's rolling 24h off Binance. */
  suffix?: string
  /** Optional tooltip text on hover. */
  title?: string
}

export const PriceChange = ({
  change,
  format = 'pct',
  fontSize = 12,
  suffix,
  title,
}: Props) => {
  if (change == null || !isValidNumber(change)) {
    return <span style={{ color: colors.textDim, fontSize }}>—</span>
  }

  const isPositive = change >= 0
  const color = isPositive ? colors.green : colors.red
  const bg = isPositive ? colors.greenDim : colors.redDim
  const sign = isPositive ? '+' : ''
  const display =
    format === 'pct'
      ? `${sign}${(change * 100).toFixed(2)}%`
      : `${sign}${change.toFixed(2)}`

  return (
    <span
      title={title}
      style={{
        color,
        fontFamily: fonts.mono,
        fontWeight: 600,
        fontSize,
        background: bg,
        padding: '1px 5px',
        borderRadius: 3,
        cursor: title ? 'help' : undefined,
      }}
    >
      {display}
      {suffix && (
        <span
          style={{
            fontSize: Math.max(9, fontSize - 3),
            opacity: 0.7,
            marginLeft: 4,
            fontWeight: 500,
          }}
        >
          {suffix}
        </span>
      )}
    </span>
  )
}
