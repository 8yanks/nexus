import { useMarketStore } from '@/store/market'
import { getStrongestCorrelations, getMostDecorrelated } from '@/analytics/correlation'
import { colors, fonts, radius, card, sectionHeader, emptyState } from '@/ui/theme'
import { isValidNumber } from '@/utils/math'
import { ScreenHeader } from '@/ui/components/ScreenHeader'

// ─── COLOR SCALE: -1 (red) → 0 (neutral) → +1 (green) ─────

const corrColor = (r: number): string => {
  if (r >= 0.7) return '#00d4aa'
  if (r >= 0.3) return '#00d4aa88'
  if (r > 0.1) return '#00d4aa44'
  if (r > -0.1) return '#64748b33'
  if (r > -0.3) return '#ff446644'
  if (r > -0.7) return '#ff446688'
  return '#ff4466'
}

const corrTextColor = (r: number): string => {
  if (Math.abs(r) >= 0.5) return '#fff'
  return colors.textMuted
}

// ─── FIND SYMBOL BY ID ──────────────────────────────────────

const useSymbolMap = (): Record<string, string> => {
  const instruments = useMarketStore((s) => s.instruments)
  const map: Record<string, string> = {}
  for (const i of instruments) map[i.id] = i.symbol
  return map
}

// ─── PAIR ROW ───────────────────────────────────────────────

const PairRow = ({ a, b, r, symbolMap, colorFn }: {
  a: string; b: string; r: number
  symbolMap: Record<string, string>
  colorFn: (r: number) => string
}) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '6px 0',
      borderBottom: `1px solid ${colors.border}`,
      fontSize: 12,
    }}
  >
    <span style={{ color: colors.text, fontWeight: 500 }}>
      {symbolMap[a] ?? a}
      <span style={{ color: colors.textDim, margin: '0 4px' }}>/</span>
      {symbolMap[b] ?? b}
    </span>
    <span
      style={{
        fontFamily: fonts.mono,
        fontWeight: 700,
        fontSize: 13,
        color: colorFn(r),
        minWidth: 60,
        textAlign: 'right',
      }}
    >
      {isValidNumber(r) ? `${r >= 0 ? '+' : ''}${r.toFixed(3)}` : '—'}
    </span>
  </div>
)

// ─── COMPONENT ──────────────────────────────────────────────

export const Correlation = () => {
  const correlation = useMarketStore((s) => s.correlation)
  const symbolMap = useSymbolMap()

  if (!correlation) {
    return (
      <>
        <ScreenHeader
          title="Correlation Matrix"
          subtitle="Pearson rolling 50 périodes sur log-returns. Heatmap + paires les plus corrélées et les plus décorrélées."
        />
        <div style={{ padding: '14px 20px' }}>
          <div style={emptyState}>Waiting for data to compute correlation matrix...</div>
        </div>
      </>
    )
  }

  const { instrumentIds, matrix, pairs } = correlation
  const n = instrumentIds.length
  const strongest = getStrongestCorrelations(pairs, 8)
  const decorrelated = getMostDecorrelated(pairs, 8)

  const cellSize = 44
  const labelWidth = 68

  return (
    <>
      <ScreenHeader
        title="Correlation Matrix"
        subtitle="Pearson rolling 50 périodes sur log-returns. Heatmap + paires les plus corrélées et les plus décorrélées."
        badge={
          <span
            style={{
              padding: '2px 8px',
              borderRadius: radius.badge,
              background: colors.bgHover,
              border: `1px solid ${colors.border}`,
              fontSize: 10,
              fontFamily: fonts.mono,
              color: colors.textMuted,
              letterSpacing: '0.04em',
            }}
            data-testid="correlation-instruments-badge"
          >
            {n} instruments
          </span>
        }
      />
      <div style={{ padding: '14px 20px' }}>
      {/* Heatmap */}
      <div style={{ ...card, overflowX: 'auto', marginBottom: 16 }}>
        <div style={{ display: 'inline-block' }}>
          {/* Header row */}
          <div style={{ display: 'flex' }}>
            <div style={{ width: labelWidth, minWidth: labelWidth }} />
            {instrumentIds.map((id) => (
              <div
                key={id}
                style={{
                  width: cellSize,
                  minWidth: cellSize,
                  textAlign: 'center',
                  fontSize: 8,
                  fontFamily: fonts.mono,
                  color: colors.textMuted,
                  padding: '4px 0',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  transform: 'rotate(-45deg)',
                  transformOrigin: 'center center',
                  height: 44,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                }}
              >
                {symbolMap[id] ?? id}
              </div>
            ))}
          </div>

          {/* Matrix rows */}
          {instrumentIds.map((rowId, i) => (
            <div key={rowId} style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  width: labelWidth,
                  minWidth: labelWidth,
                  fontSize: 9,
                  fontFamily: fonts.mono,
                  color: colors.textMuted,
                  paddingRight: 6,
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {symbolMap[rowId] ?? rowId}
              </div>
              {instrumentIds.map((colId, j) => {
                const r = matrix[i][j]
                const isSelf = i === j
                return (
                  <div
                    key={colId}
                    title={`${symbolMap[rowId] ?? rowId} × ${symbolMap[colId] ?? colId}: ${isValidNumber(r) ? r.toFixed(3) : '—'}`}
                    style={{
                      width: cellSize,
                      minWidth: cellSize,
                      height: cellSize,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 9,
                      fontFamily: fonts.mono,
                      fontWeight: 600,
                      color: isSelf ? colors.textDim : corrTextColor(r),
                      background: isSelf ? `${colors.textDim}22` : corrColor(r),
                      border: `1px solid ${colors.bg}`,
                      borderRadius: 2,
                    }}
                  >
                    {isSelf ? '1.00' : isValidNumber(r) ? r.toFixed(2) : '—'}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 12, fontSize: 10, color: colors.textDim }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 12, borderRadius: 2, background: '#ff4466', display: 'inline-block' }} /> Strong negative
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 12, borderRadius: 2, background: '#64748b33', display: 'inline-block' }} /> Neutral
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 12, borderRadius: 2, background: '#00d4aa', display: 'inline-block' }} /> Strong positive
          </span>
        </div>
      </div>

      {/* Strongest + Decorrelated */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ ...card, borderTop: `3px solid ${colors.green}` }}>
          <div style={sectionHeader}>Strongest Correlations</div>
          {strongest.map((p, i) => (
            <PairRow
              key={i}
              a={p.instrumentA}
              b={p.instrumentB}
              r={p.correlation}
              symbolMap={symbolMap}
              colorFn={(r) => (r > 0 ? colors.green : colors.red)}
            />
          ))}
          {strongest.length === 0 && <div style={{ fontSize: 12, color: colors.textDim, padding: 8 }}>No pairs yet</div>}
        </div>

        <div style={{ ...card, borderTop: `3px solid ${colors.yellow}` }}>
          <div style={sectionHeader}>Most Decorrelated</div>
          {decorrelated.map((p, i) => (
            <PairRow
              key={i}
              a={p.instrumentA}
              b={p.instrumentB}
              r={p.correlation}
              symbolMap={symbolMap}
              colorFn={() => colors.yellow}
            />
          ))}
          {decorrelated.length === 0 && <div style={{ fontSize: 12, color: colors.textDim, padding: 8 }}>No pairs yet</div>}
        </div>
      </div>
      </div>
    </>
  )
}
