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

const pnlColor = (v: number): string =>
  v > 0 ? colors.green : v < 0 ? colors.red : colors.textSecondary

export const ChainMonitor = () => {
  const {
    entries,
    orders,
    decisions,
    positions,
    portfolio,
    lastOutcome,
    autoRun,
    autoRunIntervalMs,
    runDemo,
    clear,
    closePosition,
    setAutoRun,
  } = useChainStore()

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
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <label
            style={{
              ...mono,
              color: colors.textSecondary,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={autoRun}
              onChange={(e) => setAutoRun(e.target.checked)}
            />
            auto-run
          </label>
          <select
            value={autoRunIntervalMs}
            onChange={(e) => setAutoRun(autoRun, Number(e.target.value))}
            style={{
              ...mono,
              background: colors.bgInput,
              color: colors.text,
              border: `1px solid ${colors.border}`,
              borderRadius: 3,
              padding: '2px 6px',
            }}
          >
            <option value={5000}>5s</option>
            <option value={15000}>15s</option>
            <option value={30000}>30s</option>
            <option value={60000}>60s</option>
          </select>
        </div>
      </div>

      <div style={panel}>
        <div style={h}>Portfolio</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
            ...mono,
          }}
        >
          <div>
            <div style={{ color: colors.textSecondary }}>open</div>
            <div style={{ fontSize: 16 }}>{portfolio.openCount}</div>
          </div>
          <div>
            <div style={{ color: colors.textSecondary }}>gross exposure</div>
            <div style={{ fontSize: 16 }}>
              {portfolio.grossExposure.toFixed(2)}
            </div>
          </div>
          <div>
            <div style={{ color: colors.textSecondary }}>unrealized PnL</div>
            <div
              style={{ fontSize: 16, color: pnlColor(portfolio.unrealizedPnl) }}
            >
              {portfolio.unrealizedPnl.toFixed(2)}
            </div>
          </div>
          <div>
            <div style={{ color: colors.textSecondary }}>realized PnL</div>
            <div
              style={{ fontSize: 16, color: pnlColor(portfolio.realizedPnl) }}
            >
              {portfolio.realizedPnl.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {positions.length > 0 && (
        <div style={panel}>
          <div style={h}>Positions ({positions.length})</div>
          <table style={{ ...mono, width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: colors.textSecondary }}>
                <th style={{ textAlign: 'left' }}>sym</th>
                <th style={{ textAlign: 'left' }}>side</th>
                <th style={{ textAlign: 'right' }}>size</th>
                <th style={{ textAlign: 'right' }}>entry</th>
                <th style={{ textAlign: 'right' }}>mark</th>
                <th style={{ textAlign: 'right' }}>SL</th>
                <th style={{ textAlign: 'right' }}>TP</th>
                <th style={{ textAlign: 'right' }}>PnL</th>
                <th style={{ textAlign: 'left' }}>status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => {
                const pnl =
                  p.status === 'open' ? p.unrealizedPnl : (p.realizedPnl ?? 0)
                return (
                  <tr key={p.id}>
                    <td>{p.symbol}</td>
                    <td
                      style={{
                        color: p.side === 'long' ? colors.green : colors.red,
                      }}
                    >
                      {p.side}
                    </td>
                    <td style={{ textAlign: 'right' }}>{p.size}</td>
                    <td style={{ textAlign: 'right' }}>
                      {p.entryPrice.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {p.markPrice.toFixed(2)}
                    </td>
                    <td
                      style={{ textAlign: 'right', color: colors.textMuted }}
                    >
                      {p.stopLoss?.toFixed(2) ?? '—'}
                    </td>
                    <td
                      style={{ textAlign: 'right', color: colors.textMuted }}
                    >
                      {p.takeProfit?.toFixed(2) ?? '—'}
                    </td>
                    <td
                      style={{ textAlign: 'right', color: pnlColor(pnl) }}
                    >
                      {pnl.toFixed(2)}
                    </td>
                    <td
                      style={{
                        color:
                          p.status === 'open'
                            ? colors.textSecondary
                            : p.closeReason === 'take_profit'
                              ? colors.green
                              : p.closeReason === 'stop_loss'
                                ? colors.red
                                : colors.textMuted,
                      }}
                    >
                      {p.status === 'open' ? 'open' : (p.closeReason ?? 'closed')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {p.status === 'open' && (
                        <button
                          onClick={() => closePosition(p.id)}
                          style={{
                            background: 'transparent',
                            border: `1px solid ${colors.border}`,
                            color: colors.textSecondary,
                            borderRadius: 3,
                            padding: '1px 6px',
                            fontSize: 10,
                            cursor: 'pointer',
                            fontFamily: fonts.mono,
                          }}
                        >
                          close
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

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
