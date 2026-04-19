import { useEffect, useMemo, useState } from 'react'
import type { AuditModule } from '@/types/audit'
import { useChainStore } from '@/store/chain'
import { DEFAULT_SENTINEL_RULES } from '@/sentinel/rules'
import {
  EMPTY_FILTER,
  filterAuditEntries,
  isEmptyFilter,
  loadAuditFilter,
  saveAuditFilter,
  uniqueModules,
  type AuditFilter,
} from '@/ui/audit-filter'
import { colors, fonts, radius, btnSecondary, btnSmall } from '@/ui/theme'
import { ScreenHeader } from '@/ui/components/ScreenHeader'
import {
  decisionsToCSV,
  vetosToCSV,
  ordersToCSV,
  positionsToCSV,
  buildChainPayload,
  downloadText,
} from '@/export/chain'
import {
  inspectConsensus,
  consensusLabel,
  consensusTooltip,
} from '@/ui/consensus-display'
import { buildDrilldown } from '@/ui/decision-drilldown'
import { DecisionDrilldownModal } from '@/ui/components/DecisionDrilldown'
import { isRunChainShortcut } from '@/ui/keybinds'

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
    vetos,
    lastOutcome,
    autoRun,
    autoRunIntervalMs,
    safeMode,
    lastContextInstrumentId,
    reviewQueue,
    runDemo,
    clear,
    closePosition,
    setAutoRun,
    setSafeMode,
    acceptReview,
    dismissReview,
  } = useChainStore()

  const [auditFilter, setAuditFilter] = useState<AuditFilter>(loadAuditFilter)
  const [drilldownId, setDrilldownId] = useState<string | null>(null)

  // Persist filter on change (cleared back to localStorage when reset).
  useEffect(() => {
    saveAuditFilter(auditFilter)
  }, [auditFilter])

  // Keybind: 'r' runs the chain. Skipped when the user is typing in a
  // form field or when the drilldown modal is open (the modal owns
  // Escape; staying out of its way avoids surprising input collisions).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (drilldownId !== null) return
      if (!isRunChainShortcut(e)) return
      e.preventDefault()
      void runDemo()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [runDemo, drilldownId])
  const moduleOptions = useMemo(() => uniqueModules(entries), [entries])
  const filteredEntries = useMemo(
    () => filterAuditEntries(entries, auditFilter),
    [entries, auditFilter],
  )
  const drilldown = useMemo(() => {
    if (drilldownId === null) return null
    const d = decisions.find((x) => x.id === drilldownId)
    if (!d) return null
    return buildDrilldown(d, { vetos, orders, positions, entries })
  }, [drilldownId, decisions, vetos, orders, positions, entries])

  const exportAll = (format: 'csv' | 'json') => {
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    if (format === 'json') {
      const payload = buildChainPayload(decisions, vetos, orders, positions, entries)
      downloadText(
        `nexus_chain_${ts}.json`,
        JSON.stringify(payload, null, 2),
        'application/json',
      )
      return
    }
    // CSV: emit one file per artefact, packaged sequentially.
    if (decisions.length) downloadText(`nexus_decisions_${ts}.csv`, decisionsToCSV(decisions))
    if (vetos.length) downloadText(`nexus_vetos_${ts}.csv`, vetosToCSV(vetos))
    if (orders.length) downloadText(`nexus_orders_${ts}.csv`, ordersToCSV(orders))
    if (positions.length) downloadText(`nexus_positions_${ts}.csv`, positionsToCSV(positions))
  }

  return (
    <>
      <ScreenHeader
        title="Chain Monitor"
        subtitle="Pipeline de décision: scoring → AI → sentinel → exécution paper. Audit trail complet + drilldown par décision."
        badge={
          lastOutcome ? (
            <span
              style={{
                padding: '2px 8px',
                borderRadius: radius.badge,
                background: colors.bgHover,
                border: `1px solid ${colors.border}`,
                fontSize: 10,
                fontFamily: fonts.mono,
                color: stageColor(lastOutcome),
                letterSpacing: '0.04em',
              }}
              data-testid="chain-outcome-badge"
            >
              last: {lastOutcome}
            </span>
          ) : undefined
        }
        actions={
          <span style={{ ...mono, color: colors.textMuted }}>
            ctx:{' '}
            {lastContextInstrumentId ? (
              <span style={{ color: colors.accent }}>{lastContextInstrumentId}</span>
            ) : (
              <span style={{ color: colors.orange }}>synthetic</span>
            )}
          </span>
        }
        settings={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label
              style={{
                ...mono,
                color: safeMode ? colors.red : colors.textSecondary,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
              }}
              title="Safe mode forces every non-HOLD decision to be vetoed."
            >
              <input
                type="checkbox"
                checked={safeMode}
                onChange={(e) => setSafeMode(e.target.checked)}
              />
              safe mode (force veto on every non-HOLD)
            </label>
            <label
              style={{
                ...mono,
                color: colors.textSecondary,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={autoRun}
                onChange={(e) => setAutoRun(e.target.checked)}
              />
              auto-run the chain on a fixed interval
            </label>
            <label
              style={{
                ...mono,
                color: colors.textSecondary,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              auto-run interval
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
            </label>
          </div>
        }
        settingsTitle="Settings — Chain Monitor"
      />
      <div
        style={{
          padding: '14px 20px',
          fontFamily: fonts.sans,
          color: colors.text,
          display: 'grid',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => void runDemo()}
            title="Run the decision chain (shortcut: r)"
            style={{
              background: colors.accent,
              color: colors.bg,
              border: 'none',
              borderRadius: 4,
              padding: '6px 12px',
              cursor: 'pointer',
              fontFamily: fonts.sans,
              fontSize: 12,
            }}
          >
            Run decision chain{' '}
            <kbd
              style={{
                fontFamily: fonts.mono,
                fontSize: 10,
                padding: '0 4px',
                marginLeft: 2,
                background: 'rgba(255,255,255,0.15)',
                borderRadius: 2,
              }}
            >
              r
            </kbd>
          </button>
          <button onClick={clear} style={btnSecondary}>
            Clear
          </button>
          <button
            onClick={() => exportAll('csv')}
            disabled={decisions.length + orders.length + positions.length === 0}
            style={{
              ...btnSecondary,
              opacity:
                decisions.length + orders.length + positions.length === 0 ? 0.4 : 1,
            }}
          >
            Export CSV
          </button>
          <button onClick={() => exportAll('json')} style={btnSecondary}>
            Export JSON
          </button>
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
                      maxWidth: 280,
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
                        ...btnSmall,
                        border: `1px solid ${colors.green}`,
                        color: colors.green,
                        marginRight: 4,
                      }}
                    >
                      accept
                    </button>
                    <button
                      onClick={() => dismissReview(r.id)}
                      style={btnSmall}
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
                          style={{ ...btnSmall, padding: '1px 6px' }}
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
          gridTemplateColumns: 'repeat(4, 1fr)',
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
          <div style={h}>Sentinel vetos ({vetos.length})</div>
          {vetos.length === 0 ? (
            <div style={{ ...mono, color: colors.textMuted }}>—</div>
          ) : (
            <ul
              style={{
                ...mono,
                margin: 0,
                padding: 0,
                listStyle: 'none',
                maxHeight: 200,
                overflowY: 'auto',
              }}
            >
              {vetos.slice(0, 10).map((v) => (
                <li
                  key={v.id}
                  style={{ padding: '2px 0', color: colors.textSecondary }}
                >
                  <span
                    style={{
                      color: v.approved ? colors.green : colors.red,
                    }}
                  >
                    {v.approved ? '✓' : '✗'}
                  </span>{' '}
                  {v.approved
                    ? 'approved'
                    : v.vetoReasons.slice(0, 2).join(', ')}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={panel}>
          <div style={h}>Recent decisions ({decisions.length})</div>
          {decisions.length === 0 ? (
            <div style={{ ...mono, color: colors.textMuted }}>—</div>
          ) : (
            <ul style={{ ...mono, margin: 0, padding: 0, listStyle: 'none' }}>
              {decisions.slice(0, 10).map((d) => {
                const info = inspectConsensus(d)
                const label = consensusLabel(info)
                const tooltip = consensusTooltip(info) ?? undefined
                const badgeColor = info.isSplit
                  ? colors.orange
                  : info.share !== null && info.share < 1
                    ? colors.yellow
                    : colors.textMuted
                return (
                  <li
                    key={d.id}
                    onClick={() => setDrilldownId(d.id)}
                    title="click for full decision drilldown"
                    style={{
                      padding: '2px 4px',
                      color: colors.textSecondary,
                      cursor: 'pointer',
                      borderRadius: 2,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = colors.bgHover)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = 'transparent')
                    }
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
                    {label && (
                      <span
                        title={tooltip}
                        style={{
                          marginLeft: 6,
                          fontSize: 10,
                          padding: '0 4px',
                          borderRadius: 2,
                          border: `1px solid ${badgeColor}`,
                          color: badgeColor,
                          cursor: tooltip ? 'help' : 'default',
                        }}
                      >
                        {label}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <div style={panel}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ ...h, marginBottom: 0 }}>
            Audit trail ({filteredEntries.length}
            {filteredEntries.length !== entries.length && `/${entries.length}`})
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <select
              value={auditFilter.module}
              onChange={(e) =>
                setAuditFilter((f) => ({
                  ...f,
                  module: e.target.value as AuditModule | 'all',
                }))
              }
              style={{
                ...mono,
                background: colors.bgInput,
                color: colors.text,
                border: `1px solid ${colors.border}`,
                borderRadius: 3,
                padding: '2px 6px',
              }}
            >
              <option value="all">all modules</option>
              {moduleOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="filter event / summary"
              value={auditFilter.query}
              onChange={(e) =>
                setAuditFilter((f) => ({ ...f, query: e.target.value }))
              }
              style={{
                ...mono,
                background: colors.bgInput,
                color: colors.text,
                border: `1px solid ${colors.border}`,
                borderRadius: 3,
                padding: '2px 6px',
                minWidth: 180,
              }}
            />
            {auditFilter.decisionId && (
              <span
                title={`scoped to decision ${auditFilter.decisionId}`}
                style={{
                  ...mono,
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 3,
                  background: `${colors.accent}18`,
                  color: colors.accent,
                  border: `1px solid ${colors.accent}40`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                decision: {auditFilter.decisionId.slice(0, 8)}…
                <button
                  onClick={() =>
                    setAuditFilter((f) => ({ ...f, decisionId: undefined }))
                  }
                  aria-label="clear decision filter"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: colors.accent,
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: 12,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </span>
            )}
            {!isEmptyFilter(auditFilter) && (
              <button
                onClick={() => setAuditFilter(EMPTY_FILTER)}
                style={{ ...btnSmall, padding: '2px 8px' }}
              >
                clear
              </button>
            )}
          </div>
        </div>
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
              {filteredEntries.slice(0, 200).map((e) => (
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

      {drilldown && (
        <DecisionDrilldownModal
          data={drilldown}
          onClose={() => setDrilldownId(null)}
          onJumpToAudit={(id) => {
            // Filter the audit panel to only show events tagged with this
            // decision id, then close the modal so the table is visible.
            setAuditFilter({ module: 'all', query: '', decisionId: id })
            setDrilldownId(null)
          }}
        />
      )}
      </div>
    </>
  )
}
