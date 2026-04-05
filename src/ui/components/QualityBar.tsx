import { colors, fonts } from '@/ui/theme'

interface Props {
  score: number    // 0–1
  width?: number
  height?: number
  showLabel?: boolean
}

const getColor = (score: number): string => {
  if (score >= 0.8) return colors.green
  if (score >= 0.5) return colors.yellow
  return colors.red
}

export const QualityBar = ({ score, width = 60, height = 6, showLabel = true }: Props) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
    <span
      style={{
        display: 'inline-block',
        width,
        height,
        background: `${colors.textDim}33`,
        borderRadius: height / 2,
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          display: 'block',
          width: `${Math.min(100, score * 100)}%`,
          height: '100%',
          background: getColor(score),
          borderRadius: height / 2,
          transition: 'width 0.3s ease',
        }}
      />
    </span>
    {showLabel && (
      <span style={{ fontSize: 11, fontFamily: fonts.mono, color: getColor(score) }}>
        {(score * 100).toFixed(0)}%
      </span>
    )}
  </span>
)
