import { Bell, BellOff, Trash2, ShieldAlert } from 'lucide-react'
import { useMarketStore } from '@/store/market'
import { SeverityBadge } from '@/ui/components/SeverityBadge'
import { colors, fonts, card, thStyle, tdStyle, monoTd, emptyState, statLabel, statValue } from '@/ui/theme'

export const Alerts = () => {
  const alertRules = useMarketStore((s) => s.alertRules)
  const toggleAlertRule = useMarketStore((s) => s.toggleAlertRule)
  const removeAlertRule = useMarketStore((s) => s.removeAlertRule)

  const activeCount = alertRules.filter((r) => r.active).length
  const criticalCount = alertRules.filter((r) => r.severity === 'critical').length

  return (
    <div style={{ padding: '16px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <ShieldAlert size={18} style={{ color: colors.accent }} />
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: colors.text, fontFamily: fonts.sans }}>
          Alert Rules
        </h1>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total Rules', value: String(alertRules.length), color: colors.text },
          { label: 'Active', value: String(activeCount), color: colors.green },
          { label: 'Inactive', value: String(alertRules.length - activeCount), color: colors.textDim },
          { label: 'Critical', value: String(criticalCount), color: colors.red },
        ].map((kpi) => (
          <div key={kpi.label} style={card}>
            <div style={statLabel}>{kpi.label}</div>
            <div style={{ ...statValue, fontSize: 22, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: fonts.sans }}>
          <thead>
            <tr>
              {['Status', 'Instrument', 'Type', 'Threshold', 'Severity', ''].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alertRules.map((rule, idx) => (
              <tr
                key={rule.id}
                style={{
                  background: idx % 2 === 0 ? colors.bgTableRow : colors.bgTableRowAlt,
                  opacity: rule.active ? 1 : 0.5,
                }}
              >
                <td style={{ ...tdStyle, width: 60 }}>
                  <button
                    onClick={() => toggleAlertRule(rule.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 4,
                      color: rule.active ? colors.green : colors.textDim,
                    }}
                    title={rule.active ? 'Disable' : 'Enable'}
                  >
                    {rule.active ? <Bell size={14} /> : <BellOff size={14} />}
                  </button>
                </td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{rule.instrumentId}</td>
                <td style={{ ...monoTd, color: colors.textSecondary, fontSize: 12 }}>
                  {rule.type.replace(/_/g, ' ')}
                </td>
                <td style={monoTd}>{rule.value}</td>
                <td style={tdStyle}><SeverityBadge severity={rule.severity} /></td>
                <td style={{ ...tdStyle, width: 50, textAlign: 'center' }}>
                  <button
                    onClick={() => removeAlertRule(rule.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 4,
                      color: colors.red,
                      opacity: 0.6,
                    }}
                    title="Remove"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {alertRules.length === 0 && (
          <div style={emptyState}>
            <BellOff size={24} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div>No alert rules configured</div>
          </div>
        )}
      </div>
    </div>
  )
}
