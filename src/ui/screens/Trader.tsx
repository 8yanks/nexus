import { useMemo } from 'react'
import { useChainStore } from '@/store/chain'
import { colors, fonts, radius, btnSmall } from '@/ui/theme'
import { ScreenHeader } from '@/ui/components/ScreenHeader'
import { NotFinancialAdviceBanner } from '@/ui/components/NotFinancialAdviceBanner'

// ─── TRADER SCREEN ──────────────────────────────────────────
// Dedicated view for the execution bot: portfolio, positions (open +
// closed), orders, slippage, PnL breakdown. ChainMonitor shows the
// pipeline end-to-end; this screen zooms in on trade execution.

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

const pnlColor = (v: number): string =>
  v > 0 ? colors.green : v < 0 ? colors.red : colors.textSecondary

export const Trader = () => {
  const { positions, orders, portfolio, closePosition } = useChainStore()

  const openPositions = useMemo(
    () => positions.filter((p) => p.status === 'open'),
    [positions],
  )
  const closedPositions = useMemo(
    () => positions.filter((p) => p.status === 'closed'),
    [positions],
  )

  // Order stats: count by status, mean slippage, fill rate.
  const orderStats = useMemo(() => {
    const total = orders.length
    const filled = orders.filter((o) => o.status === 'filled').length
    const rejected = orders.filter((o) => o.status === 'rejected').length
    const slippages = orders
      .filter((o) => o.status === 'filled')
      .map((o) => o.slippage)
    const meanSlip =
      slippages.length > 0
        ? slippages.reduce((s, x) => s + x, 0) / slippages.length
        : 0
    return {
      total,
      filled,
      rejected,
      fillRate: total > 0 ? filled / total : 0,
      meanSlip,
    }
  }, [orders])

  // Closure breakdown for closed positions.
  const closureBreakdown = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of closedPositions) {
      const k = p.closeReason ?? 'unknown'
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  }, [closedPositions])

  return (
    <>
      <ScreenHeader
        title="Trader"
        subtitle="Vue execution: portfolio, positions ouvertes/fermées, blotter d'ordres, slippage. Paper trading uniquement — dry-run."
        badge={
          <span
            style={{
              padding: '2px 8px',
              borderRadius: radius.badge,
              background: colors.bgHover,
              border: `1px solid ${colors.border}`,
              fontSize: 10,
              fontFamily: fonts.mono,
              color: colors.purple,
              letterSpacing: '0.04em',
            }}
            data-testid="trader-paper-badge"
          >
            paper · {orderStats.total} orders · {positions.length} pos
          </span>
        }
        actions={
          <span
            style={{
              ...mono,
              color: pnlColor(portfolio.unrealizedPnl + portfolio.realizedPnl),
            }}
            data-testid="trader-pnl-summary"
          >
            net PnL {(portfolio.unrealizedPnl + portfolio.realizedPnl).toFixed(2)}
          </span>
        }
      />
      <NotFinancialAdviceBanner context="Simulated fills only — no real broker is connected." />
      <div
        style={{
          padding: '14px 20px',
          fontFamily: fonts.sans,
          color: colors.text,
          display: 'grid',
          gap: 12,
        }}
      >
      {/* Portfolio stat row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
        }}
      >
        <div style={panel}>
          <div style={h}>open positions</div>
          <div style={{ ...mono, fontSize: 20 }}>{portfolio.openCount}</div>
        </div>
        <div style={panel}>
          <div style={h}>gross exposure</div>
          <div style={{ ...mono, fontSize: 20 }}>
            {portfolio.grossExposure.toFixed(2)}
          </div>
        </div>
        <div style={panel}>
          <div style={h}>unrealized PnL</div>
          <div
            style={{
              ...mono,
              fontSize: 20,
              color: pnlColor(portfolio.unrealizedPnl),
            }}
          >
            {portfolio.unrealizedPnl.toFixed(2)}
          </div>
        </div>
        <div style={panel}>
          <div style={h}>realized PnL</div>
          <div
            style={{
              ...mono,
              fontSize: 20,
              color: pnlColor(portfolio.realizedPnl),
            }}
          >
            {portfolio.realizedPnl.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Execution stat row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }}
      >
        <div style={panel}>
          <div style={h}>fill rate</div>
          <div style={{ ...mono, fontSize: 16 }}>
            {orderStats.total > 0
              ? `${(orderStats.fillRate * 100).toFixed(0)}%`
              : '—'}
            <span
              style={{ color: colors.textMuted, fontSize: 11, marginLeft: 6 }}
            >
              ({orderStats.filled}/{orderStats.total})
            </span>
          </div>
        </div>
        <div style={panel}>
          <div style={h}>mean slippage</div>
          <div style={{ ...mono, fontSize: 16 }}>
            {orderStats.filled > 0
              ? orderStats.meanSlip.toFixed(4)
              : '—'}
          </div>
        </div>
        <div style={panel}>
          <div style={h}>rejected orders</div>
          <div
            style={{
              ...mono,
              fontSize: 16,
              color: orderStats.rejected > 0 ? colors.red : colors.textSecondary,
            }}
          >
            {orderStats.rejected}
          </div>
        </div>
      </div>

      {/* Open positions */}
      <div style={panel}>
        <div style={h}>Open positions ({openPositions.length})</div>
        {openPositions.length === 0 ? (
          <div style={{ ...mono, color: colors.textMuted }}>
            No open positions. Run the chain from the Chain screen.
          </div>
        ) : (
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
                <th style={{ textAlign: 'right' }}>%</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {openPositions.map((p) => (
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
                  <td style={{ textAlign: 'right', color: colors.textMuted }}>
                    {p.stopLoss?.toFixed(2) ?? '—'}
                  </td>
                  <td style={{ textAlign: 'right', color: colors.textMuted }}>
                    {p.takeProfit?.toFixed(2) ?? '—'}
                  </td>
                  <td
                    style={{ textAlign: 'right', color: pnlColor(p.unrealizedPnl) }}
                  >
                    {p.unrealizedPnl.toFixed(2)}
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      color: pnlColor(p.unrealizedPnl),
                    }}
                  >
                    {(p.unrealizedPnlPct * 100).toFixed(2)}%
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => closePosition(p.id)}
                      style={{ ...btnSmall, padding: '1px 6px' }}
                    >
                      close
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Closed positions */}
      <div style={panel}>
        <div
          style={{
            ...h,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span>Closed positions ({closedPositions.length})</span>
          {closureBreakdown.length > 0 && (
            <span style={{ color: colors.textMuted, fontSize: 10 }}>
              {closureBreakdown
                .map(([reason, count]) => `${reason} ${count}`)
                .join(' · ')}
            </span>
          )}
        </div>
        {closedPositions.length === 0 ? (
          <div style={{ ...mono, color: colors.textMuted }}>—</div>
        ) : (
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            <table
              style={{ ...mono, width: '100%', borderCollapse: 'collapse' }}
            >
              <thead>
                <tr style={{ color: colors.textSecondary }}>
                  <th style={{ textAlign: 'left' }}>sym</th>
                  <th style={{ textAlign: 'left' }}>side</th>
                  <th style={{ textAlign: 'right' }}>size</th>
                  <th style={{ textAlign: 'right' }}>entry</th>
                  <th style={{ textAlign: 'right' }}>exit</th>
                  <th style={{ textAlign: 'left' }}>reason</th>
                  <th style={{ textAlign: 'right' }}>realized</th>
                </tr>
              </thead>
              <tbody>
                {closedPositions.map((p) => (
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
                      style={{
                        color:
                          p.closeReason === 'take_profit'
                            ? colors.green
                            : p.closeReason === 'stop_loss'
                              ? colors.red
                              : colors.textMuted,
                      }}
                    >
                      {p.closeReason ?? 'closed'}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        color: pnlColor(p.realizedPnl ?? 0),
                      }}
                    >
                      {(p.realizedPnl ?? 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order blotter */}
      <div style={panel}>
        <div style={h}>Order blotter ({orders.length})</div>
        {orders.length === 0 ? (
          <div style={{ ...mono, color: colors.textMuted }}>—</div>
        ) : (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            <table
              style={{ ...mono, width: '100%', borderCollapse: 'collapse' }}
            >
              <thead>
                <tr style={{ color: colors.textSecondary }}>
                  <th style={{ textAlign: 'left', padding: '2px 6px' }}>time</th>
                  <th style={{ textAlign: 'left', padding: '2px 6px' }}>sym</th>
                  <th style={{ textAlign: 'left', padding: '2px 6px' }}>side</th>
                  <th style={{ textAlign: 'left', padding: '2px 6px' }}>type</th>
                  <th style={{ textAlign: 'right', padding: '2px 6px' }}>size</th>
                  <th style={{ textAlign: 'right', padding: '2px 6px' }}>price</th>
                  <th style={{ textAlign: 'right', padding: '2px 6px' }}>fill</th>
                  <th style={{ textAlign: 'right', padding: '2px 6px' }}>slip</th>
                  <th style={{ textAlign: 'left', padding: '2px 6px' }}>status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ color: colors.textMuted, padding: '2px 6px' }}>
                      {new Date(o.timestamp).toLocaleTimeString()}
                    </td>
                    <td style={{ padding: '2px 6px' }}>{o.symbol}</td>
                    <td
                      style={{
                        color: o.side === 'buy' ? colors.green : colors.red,
                        padding: '2px 6px',
                      }}
                    >
                      {o.side}
                    </td>
                    <td
                      style={{ color: colors.textMuted, padding: '2px 6px' }}
                    >
                      {o.type}
                    </td>
                    <td style={{ textAlign: 'right', padding: '2px 6px' }}>
                      {o.size}
                    </td>
                    <td style={{ textAlign: 'right', padding: '2px 6px' }}>
                      {o.price.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '2px 6px' }}>
                      {o.fillPrice?.toFixed(2) ?? '—'}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        padding: '2px 6px',
                        color: colors.textMuted,
                      }}
                    >
                      {o.slippage.toFixed(4)}
                    </td>
                    <td
                      style={{
                        padding: '2px 6px',
                        color:
                          o.status === 'filled'
                            ? colors.green
                            : o.status === 'rejected'
                              ? colors.red
                              : colors.textMuted,
                      }}
                    >
                      {o.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </>
  )
}
