import { useMemo } from 'react'
import { useChainStore } from '@/store/chain'
import { DEFAULT_SENTINEL_RULES } from '@/sentinel/rules'
import { colors, fonts } from '@/ui/theme'

// ─── SENTINEL SCREEN ────────────────────────────────────────
// Dedicated view for the risk-guardrail bot: rules, safe mode, review
// queue, veto history + reason breakdown. ChainMonitor shows the pipeline
// end-to-end; this screen zooms in on the Sentinel's responsibilities.

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

const RULE_UNITS: Record<string, string> = {
  maxDrawdownPct: '%',
  maxExposurePct: '%',
  maxPositionSizePct: '%',
  minDataQuality: '',
  maxDataAgeMs: 'ms',
  maxLatencyMs: 'ms',
  maxDailyLoss: '$',
  maxDailyTrades: '',
  minModelConfidence: '',
  requireBrokerAvailable: '',
  requireHumanReviewAbove: '',
}

export const Sentinel = () => {
  const { vetos, reviewQueue, safeMode, setSafeMode, acceptReview, dismissReview } =
    useChainStore()

  // Approval rate + reason breakdown.
  const stats = useMemo(() => {
    const total = vetos.length
    const approved = vetos.filter((v) => v.approved).length
    const reasonCounts = new Map<string, number>()
    for (const v of vetos) {
      for (const r of v.vetoReasons) {
        reasonCounts.set(r, (reasonCounts.get(r) ?? 0) + 1)
      }
    }
    const reasons = Array.from(reasonCounts.entries()).sort((a, b) => b[1] - a[1])
    return {
      total,
      approved,
      vetoed: total - approved,
      approvalRate: total > 0 ? approved / total : 0,
      reasons,
    }
  }, [vetos])

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
      {/* Header + safe-mode toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: colors.yellow,
            }}
          >
            Sentinel
          </div>
          <div style={{ ...mono, color: colors.textMuted, marginTop: 2 }}>
            risk guardrail · {stats.total} checks · {stats.vetoed} vetoed ·{' '}
            {stats.approved} approved
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <label
            style={{
              ...mono,
              fontSize: 12,
              color: safeMode ? colors.red : colors.textSecondary,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              padding: '4px 10px',
              borderRadius: 4,
              border: `1px solid ${safeMode ? colors.red : colors.border}`,
              background: safeMode ? `${colors.red}10` : 'transparent',
            }}
            title="When safe mode is on, every non-HOLD decision is vetoed."
          >
            <input
              type="checkbox"
              checked={safeMode}
              onChange={(e) => setSafeMode(e.target.checked)}
            />
            safe mode {safeMode ? 'ACTIVE' : 'off'}
          </label>
        </div>
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
        }}
      >
        <div style={panel}>
          <div style={h}>approval rate</div>
          <div style={{ ...mono, fontSize: 20, color: colors.green }}>
            {stats.total > 0 ? `${(stats.approvalRate * 100).toFixed(0)}%` : '—'}
          </div>
        </div>
        <div style={panel}>
          <div style={h}>total checks</div>
          <div style={{ ...mono, fontSize: 20 }}>{stats.total}</div>
        </div>
        <div style={panel}>
          <div style={h}>vetoed</div>
          <div style={{ ...mono, fontSize: 20, color: colors.red }}>
            {stats.vetoed}
          </div>
        </div>
        <div style={panel}>
          <div style={h}>pending review</div>
          <div
            style={{
              ...mono,
              fontSize: 20,
              color: reviewQueue.length > 0 ? colors.orange : colors.textMuted,
            }}
          >
            {reviewQueue.length}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
        }}
      >
        {/* Active rules */}
        <div style={panel}>
          <div style={h}>Active rules</div>
          <table
            style={{ ...mono, width: '100%', borderCollapse: 'collapse' }}
          >
            <tbody>
              {Object.entries(DEFAULT_SENTINEL_RULES).map(([k, v]) => (
                <tr key={k}>
                  <td style={{ color: colors.textSecondary, padding: '2px 0' }}>
                    {k}
                  </td>
                  <td style={{ textAlign: 'right', color: colors.text }}>
                    {String(v)}
                    <span style={{ color: colors.textMuted, marginLeft: 3 }}>
                      {RULE_UNITS[k] ?? ''}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Veto reasons breakdown */}
        <div style={panel}>
          <div style={h}>Veto reasons ({stats.reasons.length})</div>
          {stats.reasons.length === 0 ? (
            <div style={{ ...mono, color: colors.textMuted }}>
              No vetos yet — run the chain from the Chain screen.
            </div>
          ) : (
            <table
              style={{ ...mono, width: '100%', borderCollapse: 'collapse' }}
            >
              <tbody>
                {stats.reasons.map(([reason, count]) => {
                  const share = count / stats.total
                  return (
                    <tr key={reason}>
                      <td style={{ color: colors.red, padding: '2px 0' }}>
                        {reason}
                      </td>
                      <td style={{ textAlign: 'right' }}>{count}</td>
                      <td
                        style={{
                          width: 80,
                          paddingLeft: 8,
                          color: colors.textMuted,
                        }}
                      >
                        <div
                          style={{
                            background: colors.border,
                            height: 4,
                            borderRadius: 2,
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${share * 100}%`,
                              height: '100%',
                              background: colors.red,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pending review queue */}
      {reviewQueue.length > 0 && (
        <div
          style={{
            ...panel,
            borderColor: colors.orange,
            background: `${colors.orange}08`,
          }}
        >
          <div style={{ ...h, color: colors.orange }}>
            Pending review ({reviewQueue.length})
          </div>
          <table style={{ ...mono, width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: colors.textSecondary }}>
                <th style={{ textAlign: 'left' }}>queued</th>
                <th style={{ textAlign: 'left' }}>action</th>
                <th style={{ textAlign: 'left' }}>sym</th>
                <th style={{ textAlign: 'right' }}>size</th>
                <th style={{ textAlign: 'right' }}>conf</th>
                <th style={{ textAlign: 'left' }}>thesis</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reviewQueue.map((r) => (
                <tr key={r.id}>
                  <td style={{ color: colors.textMuted }}>
                    {new Date(r.queuedAt).toLocaleTimeString()}
                  </td>
                  <td
                    style={{
                      color:
                        r.decision.action === 'BUY'
                          ? colors.green
                          : r.decision.action === 'SELL'
                            ? colors.red
                            : colors.textMuted,
                    }}
                  >
                    {r.decision.action}
                  </td>
                  <td>{r.decision.symbol}</td>
                  <td style={{ textAlign: 'right' }}>{r.decision.size}</td>
                  <td style={{ textAlign: 'right' }}>
                    {r.decision.confidence.toFixed(2)}
                  </td>
                  <td
                    style={{
                      color: colors.textSecondary,
                      maxWidth: 300,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={r.decision.thesis}
                  >
                    {r.decision.thesis}
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      onClick={() => acceptReview(r.id)}
                      style={{
                        background: 'transparent',
                        border: `1px solid ${colors.green}`,
                        color: colors.green,
                        borderRadius: 3,
                        padding: '1px 8px',
                        fontSize: 10,
                        cursor: 'pointer',
                        fontFamily: fonts.mono,
                        marginRight: 4,
                      }}
                    >
                      accept
                    </button>
                    <button
                      onClick={() => dismissReview(r.id)}
                      style={{
                        background: 'transparent',
                        border: `1px solid ${colors.border}`,
                        color: colors.textSecondary,
                        borderRadius: 3,
                        padding: '1px 8px',
                        fontSize: 10,
                        cursor: 'pointer',
                        fontFamily: fonts.mono,
                      }}
                    >
                      dismiss
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Veto history */}
      <div style={panel}>
        <div style={h}>Check history ({vetos.length})</div>
        {vetos.length === 0 ? (
          <div style={{ ...mono, color: colors.textMuted }}>
            No checks yet — run the chain from the Chain screen.
          </div>
        ) : (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            <table
              style={{ ...mono, width: '100%', borderCollapse: 'collapse' }}
            >
              <thead>
                <tr style={{ color: colors.textSecondary }}>
                  <th style={{ textAlign: 'left', padding: '2px 6px' }}>
                    time
                  </th>
                  <th style={{ textAlign: 'left', padding: '2px 6px' }}>
                    verdict
                  </th>
                  <th style={{ textAlign: 'left', padding: '2px 6px' }}>
                    reasons
                  </th>
                  <th style={{ textAlign: 'right', padding: '2px 6px' }}>
                    drawdown
                  </th>
                  <th style={{ textAlign: 'right', padding: '2px 6px' }}>
                    exposure
                  </th>
                  <th style={{ textAlign: 'right', padding: '2px 6px' }}>
                    quality
                  </th>
                  <th style={{ textAlign: 'right', padding: '2px 6px' }}>
                    latency
                  </th>
                </tr>
              </thead>
              <tbody>
                {vetos.map((v) => (
                  <tr key={v.id}>
                    <td
                      style={{
                        color: colors.textMuted,
                        padding: '2px 6px',
                      }}
                    >
                      {new Date(v.timestamp).toLocaleTimeString()}
                    </td>
                    <td
                      style={{
                        color: v.approved ? colors.green : colors.red,
                        padding: '2px 6px',
                      }}
                    >
                      {v.approved ? '✓ approved' : '✗ vetoed'}
                    </td>
                    <td
                      style={{
                        color: colors.textSecondary,
                        padding: '2px 6px',
                      }}
                    >
                      {v.approved ? '—' : v.vetoReasons.join(', ')}
                    </td>
                    <td
                      style={{ textAlign: 'right', padding: '2px 6px' }}
                    >
                      {v.riskMetrics.currentDrawdown.toFixed(3)}
                    </td>
                    <td
                      style={{ textAlign: 'right', padding: '2px 6px' }}
                    >
                      {v.riskMetrics.currentExposure.toFixed(2)}
                    </td>
                    <td
                      style={{ textAlign: 'right', padding: '2px 6px' }}
                    >
                      {v.riskMetrics.dataQualityScore.toFixed(2)}
                    </td>
                    <td
                      style={{ textAlign: 'right', padding: '2px 6px' }}
                    >
                      {v.riskMetrics.latencyMs}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
