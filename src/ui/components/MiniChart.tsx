import { ResponsiveContainer, LineChart, Line } from 'recharts'
import { colors } from '@/ui/theme'
import { isValidNumber } from '@/utils/math'

interface Props {
  data: number[]
  width?: number
  height?: number
  color?: string
}

export const MiniChart = ({
  data,
  width = 80,
  height = 30,
  color,
}: Props) => {
  // Filter out NaN/Infinity values
  const clean = data.filter(isValidNumber)
  if (clean.length < 2) {
    return <span style={{ color: colors.textDim, fontSize: 10 }}>—</span>
  }

  const first = clean[0]
  const last = clean[clean.length - 1]
  const lineColor = color ?? (last >= first ? colors.green : colors.red)

  const chartData = clean.map((v, i) => ({ i, v }))

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={lineColor}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
