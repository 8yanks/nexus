import { useChainStore } from '@/store/chain'
import { DEFAULT_SENTINEL_RULES } from '@/sentinel/rules'
import { colors, fonts } from '@/ui/theme'

const panel: React.CSSProperties = {
  background: colors.bgCard,
  border: `1px solid ${colors.border}`,
  borderRadius: 6,
  padding: 12,
}
const h: React.CSSProperties = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: 1,
  color: colors.textSecondary,
  marginBottom: 8,
}
const mono: React.CSSProperties = { fontFamily: fonts.mono, fontSize: 11 }

const stageColor = (stage: string | null): string => {
  if (stage === 'filled') return colors.green
  if (stage === 'sentinel_vetoed') return colors.red
  if (stage === 'ai_rejected') return colors.orange
  if (stage === 'order_rejected') return colors.yellow
  return colors.textMuted
}

export const ChainMonitor = () => {
  const { entries, orders, decisions, lastOutcome, runDemo, clear } =
    useChainStore()

  return (
    <div
      style={{
        padding: 16,
        fontFamily: fonts.sans,
        color: colors.text,
        display: 'grid',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={() => void runDemo()}
          style={{
            background: colors.accent,
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            padding: '6px 12px',
            cursor: 'pointer',
            fontFamily: fonts.sans,
            fontSize: 12,
          }}
        >
          Run decision chain
        </button>
        <button
          onClick={clear}
          style={{
            background: 'transparent',
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            borderRadius: 4,
            padding: '6px 12px',
            cursor: 'pointer',
            fontFamily: fonts.sans,
            fontSize: 12,
          }}
        >
          Clear
        </button>
        {lastOutcome && (
          <span style={{ ...mono, color: stageColor(lastOutcome) }}>
            last: {lastOutcome}
          </span>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 12,
        }}
      >
        <div style={panel}>
          <div style={h}>Sentinel rules</div>
          <table style={{ ...mono, width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {Object.entries(DEFAULT_SENTINEL_RULES).map(([k, v]) => (
                <tr key={k}>
                  <td style={{ color: colors.textSecondary, padding: '2px 0' }}>
                    {k}
                  </td>
                  <td style={{ textAlign: 'right' }}>{String(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={panel}>
          <div style={h}>Paper orders ({orders.length})</div>
          {orders.length === 0 ? (
            <div style={{ ...mono, color: colors.textMuted }}>
              No orders yet. Run the chain above.
            </div>
          ) : (
            <table style={{ ...mono, width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: colors.textSecondary }}>
                  <th style={{ textAlign: 'left' }}>side</th>
                  <th style={{ textAlign: 'left' }}>sym</th>
                  <th style={{ textAlign: 'right' }}>size</th>
                  <th style={{ textAlign: 'right' }}>fill</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td
                      style={{
                        color: o.side === 'buy' ? colors.green : colors.red,
                      }}
                    >
                      {o.side}
                    </td>
                    <td>{o.symbol}</td>
                    <td style={{ textAlign: 'right' }}>{o.size}</td>
                    <td style={{ textAlign: 'right' }}>
                      {o.fillPrice?.toFixed(2) ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={panel}>
          <div style={h}>Recent decisions ({decisions.length})</div>
          {decisions.length === 0 ? (
            <div style={{ ...mono, color: colors.textMuted }}>—</div>
          ) : (
            <ul style={{ ...mono, margin: 0, padding: 0, listStyle: 'none' }}>
              {decisions.slice(0, 10).map((d) => (
                <li
                  key={d.id}
                  style={{ padding: '2px 0', color: colors.textSecondary }}
                >
                  <span
                    style={{
                      color:
                        d.action === 'BUY'
                          ? colors.green
                          : d.action === 'SELL'
                            ? colors.red
                            : colors.textMuted,
                    }}
                  >
                    {d.action}
                  </span>{' '}
                  {d.symbol} · conf {d.confidence.toFixed(2)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div style={panel}>
        <div style={h}>Audit trail ({entries.length})</div>
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          <table style={{ ...mono, width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: colors.textSecondary }}>
                <th style={{ textAlign: 'left', padding: '2px 6px' }}>time</th>
                <th style={{ textAlign: 'left', padding: '2px 6px' }}>module</th>
                <th style={{ textAlign: 'left', padding: '2px 6px' }}>event</th>
                <th style={{ textAlign: 'left', padding: '2px 6px' }}>summary</th>
              </tr>
            </thead>
            <tbody>
              {entries.slice(0, 200).map((e) => (
                <tr key={e.id}>
                  <td style={{ color: colors.textMuted, padding: '2px 6px' }}>
                    {new Date(e.timestamp).toLocaleTimeString()}
                  </td>
                  <td style={{ color: colors.accent, padding: '2px 6px' }}>
                    {e.module}
                  </td>
                  <td
                    style={{
                      color:
                        e.eventType.includes('VETOED') ||
                        e.eventType.includes('REJECTED') ||
                        e.eventType.includes('ERROR')
                          ? colors.red
                          : e.eventType.includes('APPROVED') ||
                              e.eventType.includes('FILLED') ||
                              e.eventType.includes('VALIDATED')
                            ? colors.green
                            : colors.textSecondary,
                      padding: '2px 6px',
                    }}
                  >
                    {e.eventType}
                  </td>
                  <td style={{ padding: '2px 6px' }}>{e.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
