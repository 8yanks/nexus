import { AlertTriangle } from 'lucide-react'
import { useMarketStore } from '@/store/market'
import { QualityBar } from '@/ui/components/QualityBar'
import { StatusBadge } from '@/ui/components/StatusBadge'
import { colors, fonts, radius, card, thStyle, tdStyle, sectionHeader, statLabel, statValue, emptyState } from '@/ui/theme'
import { ScreenHeader } from '@/ui/components/ScreenHeader'

export const Quality = () => {
  const instruments = useMarketStore((s) => s.instruments)
  const quality = useMarketStore((s) => s.quality)
  const readiness = useMarketStore((s) => s.readiness)

  const readyColor = readiness?.ready ? colors.green : colors.red

  return (
    <>
      <ScreenHeader
        title="Data Quality"
        subtitle="Score de complétude/fraîcheur/fiabilité par instrument + verdict global de readiness pour l'analyse."
        badge={
          readiness ? (
            <span
              style={{
                padding: '2px 8px',
                borderRadius: radius.badge,
                background: colors.bgHover,
                border: `1px solid ${colors.border}`,
                fontSize: 10,
                fontFamily: fonts.mono,
                color: readyColor,
                letterSpacing: '0.04em',
              }}
              data-testid="quality-readiness-badge"
            >
              {(readiness.score * 100).toFixed(0)}% {readiness.ready ? 'ready' : 'not ready'}
            </span>
          ) : undefined
        }
      />
      <div style={{ padding: '14px 20px' }}>
      {/* Readiness Panel */}
      {readiness && (
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr auto', gap: 16, marginBottom: 16 }}>
          {/* Score */}
          <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={statLabel}>Analysis Readiness</div>
            <div
              style={{
                fontSize: 40,
                fontWeight: 800,
                fontFamily: fonts.mono,
                color: readiness.ready ? colors.green : colors.red,
                lineHeight: 1,
                marginTop: 4,
              }}
            >
              {(readiness.score * 100).toFixed(0)}%
            </div>
            <div
              style={{
                fontSize: 10,
                fontFamily: fonts.mono,
                fontWeight: 600,
                color: readiness.ready ? colors.green : colors.red,
                marginTop: 6,
                padding: '2px 8px',
                borderRadius: 4,
                background: readiness.ready ? colors.greenDim : colors.redDim,
                textTransform: 'uppercase',
              }}
            >
              {readiness.ready ? 'Ready' : 'Not Ready'}
            </div>
          </div>

          {/* Metrics grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {[
              { label: 'Instruments', value: String(readiness.instrumentCount) },
              { label: 'Live Feeds', value: String(readiness.liveCount), color: readiness.liveCount > 0 ? colors.green : colors.red },
              { label: 'Completeness', value: `${(readiness.avgCompleteness * 100).toFixed(0)}%` },
              { label: 'Freshness', value: `${(readiness.avgFreshness * 100).toFixed(0)}%` },
              { label: 'Reliability', value: `${(readiness.avgReliability * 100).toFixed(0)}%` },
            ].map((m) => (
              <div key={m.label} style={card}>
                <div style={statLabel}>{m.label}</div>
                <div style={{ ...statValue, color: m.color ?? colors.text }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Issues */}
          {readiness.issues.length > 0 && (
            <div style={card}>
              <div style={sectionHeader}>
                <AlertTriangle size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                Issues
              </div>
              {readiness.issues.map((issue, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 12,
                    color: colors.yellow,
                    padding: '4px 0',
                    borderBottom: i < readiness.issues.length - 1 ? `1px solid ${colors.border}` : 'none',
                  }}
                >
                  {issue}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Per-instrument table */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: fonts.sans }}>
          <thead>
            <tr>
              {['Instrument', 'Status', 'Overall', 'Completeness', 'Freshness', 'Reliability', 'Issues'].map(
                (h) => <th key={h} style={thStyle}>{h}</th>,
              )}
            </tr>
          </thead>
          <tbody>
            {instruments.map((inst, idx) => {
              const q = quality[inst.id]
              if (!q) return null
              return (
                <tr key={inst.id} style={{ background: idx % 2 === 0 ? colors.bgTableRow : colors.bgTableRowAlt }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{inst.symbol}</td>
                  <td style={tdStyle}><StatusBadge status={q._status} /></td>
                  <td style={tdStyle}><QualityBar score={q.overallScore} /></td>
                  <td style={tdStyle}><QualityBar score={q.completeness} showLabel={false} /></td>
                  <td style={tdStyle}><QualityBar score={q.freshness} showLabel={false} /></td>
                  <td style={tdStyle}><QualityBar score={q.reliability} showLabel={false} /></td>
                  <td style={{ ...tdStyle, fontSize: 11, color: colors.yellow, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {q.issues.length > 0 ? q.issues.join('; ') : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {Object.keys(quality).length === 0 && (
          <div style={emptyState}>Waiting for first data refresh...</div>
        )}
      </div>
      </div>
    </>
  )
}
