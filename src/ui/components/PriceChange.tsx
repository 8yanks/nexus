import { colors, fonts } from '@/ui/theme'
import { isValidNumber } from '@/utils/math'

interface Props {
  change: number | null
  format?: 'pct' | 'abs'
  fontSize?: number
}

export const PriceChange = ({ change, format = 'pct', fontSize = 12 }: Props) => {
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
      style={{
        color,
        fontFamily: fonts.mono,
        fontWeight: 600,
        fontSize,
        background: bg,
        padding: '1px 5px',
        borderRadius: 3,
      }}
    >
      {display}
    </span>
  )
}
