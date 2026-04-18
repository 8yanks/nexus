import { getJournal } from '@/signals/journal'
import { SIGNAL_CONFIGS } from '@/signals/types'
import { fmtTime, fmt } from '@/utils/format'
import { safeFixed } from '@/utils/math'
import {
  colors,
  fonts,
  radius,
  card,
  thStyle,
  tdStyle,
  monoTd,
  tagStyle,
  emptyState,
} from '@/ui/theme'
import { ScreenHeader } from '@/ui/components/ScreenHeader'

export const Journal = () => {
  const entries = [...getJournal()].reverse()

  return (
    <>
      <ScreenHeader
        title="Signal Journal"
        subtitle="Historique des signaux détectés depuis le démarrage de la session. Les 200 plus récents sont affichés."
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
            data-testid="journal-count-badge"
          >
            {entries.length} signal{entries.length !== 1 ? 's' : ''}
          </span>
        }
      />
      <div style={{ padding: '14px 20px' }}>
        {entries.length === 0 ? (
          <div style={{ ...card, ...emptyState }}>
            No signals detected yet — data will appear after the first refresh cycle
          </div>
        ) : (
          <div style={{ ...card, padding: 0, overflow: 'hidden', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: fonts.sans }}>
              <thead>
                <tr>
                  <th style={thStyle}>Time</th>
                  <th style={thStyle}>Instrument</th>
                  <th style={thStyle}>Signal</th>
                  <th style={thStyle}>Direction</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Price</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Strength</th>
                </tr>
              </thead>
              <tbody>
                {entries.slice(0, 200).map((s, idx) => {
                  const cfg = SIGNAL_CONFIGS[s.type]
                  const dirColor =
                    s.direction === 'bullish' ? colors.green
                    : s.direction === 'bearish' ? colors.red
                    : colors.yellow

                  return (
                    <tr
                      key={s.id}
                      style={{ background: idx % 2 === 0 ? colors.bgTableRow : colors.bgTableRowAlt }}
                    >
                      <td style={{ ...monoTd, fontSize: 11, color: colors.textMuted }}>
                        {fmtTime(s.timestamp)}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 600, fontSize: 13 }}>
                        {s.instrumentId}
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          ...tagStyle,
                          color: dirColor,
                          background: `${dirColor}15`,
                          fontSize: 10,
                        }}>
                          {s.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: dirColor, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>
                        {cfg.direction}
                      </td>
                      <td style={{ ...monoTd, textAlign: 'right' }}>
                        {fmt(s.price)}
                      </td>
                      <td style={{ ...monoTd, textAlign: 'right', color: colors.textMuted }}>
                        {safeFixed(s.strength * 100, 0)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
