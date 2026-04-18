import { useEffect, useState } from 'react'
import { colors, fonts, btnSmall } from '@/ui/theme'
import type { DecisionDrilldown } from '@/ui/decision-drilldown'
import { consensusLabel } from '@/ui/consensus-display'

// ─── DECISION DRILLDOWN MODAL ───────────────────────────────
// Expands a flat decision row into the full picture: thesis, per-provider
// votes/theses (for consensus decisions), invalidators, any Sentinel veto,
// the paper orders that came out of it, and the resulting position if any.
//
// Correlation logic lives in src/ui/decision-drilldown.ts so the rules are
// unit-testable. This file is only presentation.

const mono: React.CSSProperties = { fontFamily: fonts.mono, fontSize: 12 }
const label: React.CSSProperties = {
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: 1,
  color: colors.textMuted,
  marginBottom: 4,
}
const section: React.CSSProperties = {
  borderTop: `1px solid ${colors.border}`,
  paddingTop: 12,
  marginTop: 12,
}

const actionColor = (a: string): string =>
  a === 'BUY' ? colors.green : a === 'SELL' ? colors.red : colors.textMuted

const fmt = (n: number | null, digits = 2): string =>
  n === null || n === undefined ? '—' : n.toFixed(digits)

/**
 * Best-effort clipboard copy. navigator.clipboard is gated behind secure
 * contexts (https/localhost) and may be missing in older runtimes. Returns
 * true on success so the UI can flash a confirmation.
 */
const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to legacy path
  }
  // Legacy fallback: detached textarea + execCommand. Some browsers still
  // honour this even without the modern API.
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

export const DecisionDrilldownModal = ({
  data,
  onClose,
  onJumpToAudit,
}: {
  data: DecisionDrilldown
  onClose: () => void
  /** When provided, the modal renders a "jump to audit" button that hands
   *  the decision id back to the caller (typically to scope the audit
   *  panel to this decision and close the modal). */
  onJumpToAudit?: (decisionId: string) => void
}) => {
  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Toggle for the raw audit-entry payload section. Folded by default
  // because the JSON is bulky and noisy for the typical reader.
  const [showRaw, setShowRaw] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'fail'>('idle')

  const { decision: d, consensus, providers, veto, orders, position, auditEntries } = data
  const cLabel = consensusLabel(consensus)

  const handleCopy = async () => {
    const ok = await copyToClipboard(JSON.stringify(data, null, 2))
    setCopyState(ok ? 'ok' : 'fail')
    setTimeout(() => setCopyState('idle'), 1800)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.bgCard,
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
          padding: 20,
          maxWidth: 900,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          color: colors.text,
          fontFamily: fonts.sans,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: actionColor(d.action),
                }}
              >
                {d.action}
              </span>
              <span style={{ ...mono, fontSize: 14 }}>{d.symbol}</span>
              <span style={{ ...mono, color: colors.textMuted }}>
                conf {d.confidence.toFixed(2)} · {d.riskLevel} · {d.horizon}
              </span>
              {cLabel && (
                <span
                  style={{
                    ...mono,
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: 2,
                    border: `1px solid ${
                      consensus.isSplit
                        ? colors.orange
                        : consensus.share !== null && consensus.share < 1
                          ? colors.yellow
                          : colors.textMuted
                    }`,
                    color: consensus.isSplit
                      ? colors.orange
                      : consensus.share !== null && consensus.share < 1
                        ? colors.yellow
                        : colors.textMuted,
                  }}
                >
                  {cLabel}
                </span>
              )}
              {d.requiresHumanReview && (
                <span
                  style={{
                    ...mono,
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: 2,
                    border: `1px solid ${colors.orange}`,
                    color: colors.orange,
                  }}
                >
                  review
                </span>
              )}
            </div>
            <div
              style={{
                ...mono,
                color: colors.textMuted,
                fontSize: 11,
                marginTop: 4,
              }}
            >
              {new Date(d.timestamp).toLocaleString()} · {d.modelSource} · id{' '}
              {d.id}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 6,
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => void handleCopy()}
              title="Copy the full drilldown payload as JSON"
              style={{ ...btnSmall, padding: '4px 10px', fontSize: 11 }}
            >
              {copyState === 'ok'
                ? 'copied'
                : copyState === 'fail'
                  ? 'copy failed'
                  : 'copy JSON'}
            </button>
            {onJumpToAudit && (
              <button
                onClick={() => onJumpToAudit(d.id)}
                title="Filter the audit panel to events tagged with this decision id"
                style={{ ...btnSmall, padding: '4px 10px', fontSize: 11 }}
              >
                jump to audit
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              style={{ ...btnSmall, padding: '4px 10px', fontSize: 12 }}
            >
              close (esc)
            </button>
          </div>
        </div>

        {/* Price / size grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
            ...mono,
          }}
        >
          <div>
            <div style={label}>size</div>
            <div>{fmt(d.size, 4)}</div>
          </div>
          <div>
            <div style={label}>entry</div>
            <div>{fmt(d.entryPrice)}</div>
          </div>
          <div>
            <div style={label}>stop</div>
            <div>{fmt(d.stopLoss)}</div>
          </div>
          <div>
            <div style={label}>target</div>
            <div>{fmt(d.takeProfit)}</div>
          </div>
        </div>

        {/* Thesis (raw, full text) */}
        <div style={section}>
          <div style={label}>thesis</div>
          <div
            style={{
              ...mono,
              color: colors.textSecondary,
              whiteSpace: 'pre-wrap',
              lineHeight: 1.5,
            }}
          >
            {d.thesis || '—'}
          </div>
        </div>

        {/* Per-provider breakdown (when applicable) */}
        {providers.length > 0 && (
          <div style={section}>
            <div style={label}>
              providers ({providers.length})
              {consensus.isSplit && (
                <span style={{ color: colors.orange, marginLeft: 6 }}>
                  — split consensus
                </span>
              )}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(providers.length, 3)}, 1fr)`,
                gap: 8,
              }}
            >
              {providers.map((p) => (
                <div
                  key={p.providerId}
                  style={{
                    border: `1px solid ${colors.border}`,
                    borderRadius: 4,
                    padding: 8,
                    background: colors.bgCardAlt,
                  }}
                >
                  <div
                    style={{
                      ...mono,
                      fontSize: 11,
                      color: colors.accent,
                      marginBottom: 4,
                      wordBreak: 'break-all',
                    }}
                  >
                    {p.providerId}
                  </div>
                  <div
                    style={{
                      ...mono,
                      fontSize: 11,
                      display: 'flex',
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    {p.action && (
                      <span style={{ color: actionColor(p.action) }}>
                        {p.action}
                      </span>
                    )}
                    {p.confidence !== null && (
                      <span style={{ color: colors.textMuted }}>
                        conf {p.confidence.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {p.thesis && (
                    <div
                      style={{
                        ...mono,
                        fontSize: 11,
                        color: colors.textSecondary,
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.4,
                      }}
                    >
                      {p.thesis}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key factors + invalidators */}
        <div style={{ ...section, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={label}>key factors</div>
            {d.keyFactors.length === 0 ? (
              <div style={{ ...mono, color: colors.textMuted }}>—</div>
            ) : (
              <ul style={{ ...mono, margin: 0, paddingLeft: 16 }}>
                {d.keyFactors.map((k, i) => (
                  <li key={i} style={{ color: colors.textSecondary }}>
                    {k}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <div style={label}>invalidators</div>
            {d.invalidators.length === 0 ? (
              <div style={{ ...mono, color: colors.textMuted }}>—</div>
            ) : (
              <ul style={{ ...mono, margin: 0, paddingLeft: 16 }}>
                {d.invalidators.map((k, i) => (
                  <li key={i} style={{ color: colors.textSecondary }}>
                    {k}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Sentinel veto panel */}
        <div style={section}>
          <div style={label}>sentinel</div>
          {veto === null ? (
            <div style={{ ...mono, color: colors.textMuted }}>
              no sentinel check recorded for this decision
            </div>
          ) : veto.approved ? (
            <div style={{ ...mono, color: colors.green }}>
              ✓ approved
            </div>
          ) : (
            <div style={mono}>
              <div style={{ color: colors.red, marginBottom: 4 }}>
                ✗ vetoed — {veto.vetoReasons.join(', ')}
              </div>
              <div
                style={{
                  color: colors.textMuted,
                  fontSize: 11,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 4,
                }}
              >
                <span>drawdown {fmt(veto.riskMetrics.currentDrawdown, 3)}</span>
                <span>exposure {fmt(veto.riskMetrics.currentExposure, 2)}</span>
                <span>quality {fmt(veto.riskMetrics.dataQualityScore, 2)}</span>
                <span>latency {veto.riskMetrics.latencyMs}ms</span>
                <span>
                  broker {veto.riskMetrics.brokerAvailable ? 'up' : 'down'}
                </span>
                <span>safe-mode {veto.safeMode ? 'on' : 'off'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Orders */}
        <div style={section}>
          <div style={label}>orders ({orders.length})</div>
          {orders.length === 0 ? (
            <div style={{ ...mono, color: colors.textMuted }}>—</div>
          ) : (
            <table
              style={{ ...mono, width: '100%', borderCollapse: 'collapse' }}
            >
              <thead>
                <tr style={{ color: colors.textSecondary, fontSize: 11 }}>
                  <th style={{ textAlign: 'left' }}>status</th>
                  <th style={{ textAlign: 'left' }}>side</th>
                  <th style={{ textAlign: 'right' }}>size</th>
                  <th style={{ textAlign: 'right' }}>price</th>
                  <th style={{ textAlign: 'right' }}>fill</th>
                  <th style={{ textAlign: 'right' }}>slippage</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td
                      style={{
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
                    <td
                      style={{
                        color: o.side === 'buy' ? colors.green : colors.red,
                      }}
                    >
                      {o.side}
                    </td>
                    <td style={{ textAlign: 'right' }}>{fmt(o.size, 4)}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(o.price)}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(o.fillPrice)}</td>
                    <td
                      style={{
                        textAlign: 'right',
                        color: colors.textMuted,
                      }}
                    >
                      {fmt(o.slippage, 4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Position */}
        <div style={section}>
          <div style={label}>position</div>
          {position === null ? (
            <div style={{ ...mono, color: colors.textMuted }}>—</div>
          ) : (
            <div
              style={{
                ...mono,
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 8,
              }}
            >
              <div>
                <div style={label}>status</div>
                <div
                  style={{
                    color:
                      position.status === 'open'
                        ? colors.textSecondary
                        : position.closeReason === 'take_profit'
                          ? colors.green
                          : position.closeReason === 'stop_loss'
                            ? colors.red
                            : colors.textMuted,
                  }}
                >
                  {position.status === 'open'
                    ? 'open'
                    : (position.closeReason ?? 'closed')}
                </div>
              </div>
              <div>
                <div style={label}>entry → mark</div>
                <div>
                  {fmt(position.entryPrice)} → {fmt(position.markPrice)}
                </div>
              </div>
              <div>
                <div style={label}>PnL</div>
                <div
                  style={{
                    color:
                      (position.status === 'open'
                        ? position.unrealizedPnl
                        : (position.realizedPnl ?? 0)) > 0
                        ? colors.green
                        : colors.red,
                  }}
                >
                  {fmt(
                    position.status === 'open'
                      ? position.unrealizedPnl
                      : position.realizedPnl,
                  )}
                </div>
              </div>
              <div>
                <div style={label}>opened</div>
                <div style={{ color: colors.textMuted, fontSize: 11 }}>
                  {new Date(position.openedAt).toLocaleTimeString()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Raw audit entries — folded by default. Surfaces the actual
            structured payloads (AI_RESPONSE_VALIDATED, DECISION_CREATED,
            SENTINEL_*, ORDER_*, POSITION_*) tied to this decision id. */}
        {auditEntries.length > 0 && (
          <div style={section}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 4,
              }}
            >
              <div style={{ ...label, marginBottom: 0 }}>
                raw audit ({auditEntries.length})
              </div>
              <button
                onClick={() => setShowRaw((v) => !v)}
                style={{ ...btnSmall, padding: '1px 8px', fontSize: 10 }}
              >
                {showRaw ? 'hide' : 'show'}
              </button>
            </div>
            {showRaw && (
              <div style={{ display: 'grid', gap: 6 }}>
                {auditEntries.map((e) => (
                  <div
                    key={e.id}
                    style={{
                      border: `1px solid ${colors.border}`,
                      borderRadius: 4,
                      padding: 8,
                      background: colors.bgCardAlt,
                    }}
                  >
                    <div
                      style={{
                        ...mono,
                        fontSize: 11,
                        display: 'flex',
                        gap: 8,
                        marginBottom: 4,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ color: colors.textMuted }}>
                        {new Date(e.timestamp).toLocaleTimeString()}
                      </span>
                      <span style={{ color: colors.accent }}>{e.module}</span>
                      <span
                        style={{
                          color:
                            e.eventType.includes('REJECTED') ||
                            e.eventType.includes('VETOED') ||
                            e.eventType.includes('ERROR')
                              ? colors.red
                              : e.eventType.includes('VALIDATED') ||
                                  e.eventType.includes('APPROVED') ||
                                  e.eventType.includes('FILLED')
                                ? colors.green
                                : colors.textSecondary,
                        }}
                      >
                        {e.eventType}
                      </span>
                      <span style={{ color: colors.textSecondary }}>
                        {e.summary}
                      </span>
                    </div>
                    <pre
                      style={{
                        ...mono,
                        fontSize: 10,
                        margin: 0,
                        padding: 6,
                        background: colors.bg,
                        borderRadius: 3,
                        color: colors.textSecondary,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        maxHeight: 200,
                        overflowY: 'auto',
                      }}
                    >
                      {JSON.stringify(e.data, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
