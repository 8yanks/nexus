import { getFreshness, FRESHNESS_COLORS } from '@/utils/freshness'

interface Props {
  timestamp: string | null | undefined
  size?: number
}

export const FreshnessDot = ({ timestamp, size = 8 }: Props) => {
  const { level } = getFreshness(timestamp)
  return (
    <span
      title={`Data freshness: ${level}`}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: FRESHNESS_COLORS[level],
        boxShadow: level === 'fresh' ? `0 0 6px ${FRESHNESS_COLORS[level]}` : undefined,
      }}
    />
  )
}
