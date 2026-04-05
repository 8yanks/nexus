import { getJournal } from '@/signals/journal'
import { SIGNAL_CONFIGS } from '@/signals/types'
import { fmtTime, fmt } from '@/utils/format'
import { safeFixed } from '@/utils/math'
import { colors, fonts, card, thStyle, tdStyle, monoTd, tagStyle, emptyState } from '@/ui/theme'

export const Journal = () => {
  const entries = [...getJournal()].reverse()

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: colors.text }}>
          Signal Journal
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.textMuted }}>
          {entries.length} signal{entries.length !== 1 ? 's' : ''} recorded this session
        </p>
      </div>

      {entries.length === 0 ? (
        <div style={{ ...card, ...emptyState }}>
          No signals detected yet — data will appear after the first refresh cycle
        </div>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden', maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>
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
  )
}
