import { Database, Wifi, WifiOff, FlaskConical, AlertCircle } from 'lucide-react'
import { PROVIDER_DEFS } from '@/providers/registry'
import { colors, fonts, card, sectionHeader, statLabel, statValue } from '@/ui/theme'

const STATUS_ICON: Record<string, React.ReactNode> = {
  active:       <Wifi size={14} />,
  mock:         <FlaskConical size={14} />,
  error:        <AlertCircle size={14} />,
  disconnected: <WifiOff size={14} />,
}

const STATUS_COLORS: Record<string, string> = {
  active: colors.green,
  mock: colors.purple,
  error: colors.red,
  disconnected: colors.textDim,
}

export const Sources = () => {
  const activeCount = PROVIDER_DEFS.filter((p) => p.status === 'active').length
  const mockCount = PROVIDER_DEFS.filter((p) => p.status === 'mock').length
  const offlineCount = PROVIDER_DEFS.filter((p) => p.status === 'disconnected').length

  return (
    <div style={{ padding: '16px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Database size={18} style={{ color: colors.accent }} />
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: colors.text, fontFamily: fonts.sans }}>
          Data Sources
        </h1>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total Providers', value: String(PROVIDER_DEFS.length), color: colors.text },
          { label: 'Active', value: String(activeCount), color: colors.green },
          { label: 'Mock', value: String(mockCount), color: colors.purple },
          { label: 'Offline', value: String(offlineCount), color: colors.textDim },
        ].map((kpi) => (
          <div key={kpi.label} style={card}>
            <div style={statLabel}>{kpi.label}</div>
            <div style={{ ...statValue, fontSize: 22, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Provider cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
        {PROVIDER_DEFS.map((p) => {
          const statusColor = STATUS_COLORS[p.status] ?? colors.textDim
          return (
            <div
              key={p.id}
              style={{
                ...card,
                borderLeft: `3px solid ${statusColor}`,
              }}
            >
              {/* Title row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: colors.text }}>{p.name}</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 11,
                    fontFamily: fonts.mono,
                    fontWeight: 600,
                    color: statusColor,
                    padding: '3px 10px',
                    borderRadius: 4,
                    background: `${statusColor}15`,
                    textTransform: 'uppercase',
                  }}
                >
                  {STATUS_ICON[p.status]}
                  {p.status}
                </span>
              </div>

              {/* Details grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '4px 8px', fontSize: 12 }}>
                <span style={{ color: colors.textDim, fontWeight: 500 }}>Type</span>
                <span style={{ color: colors.textSecondary }}>{p.type}</span>

                <span style={{ color: colors.textDim, fontWeight: 500 }}>Endpoint</span>
                <span style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.endpoint}
                </span>

                <span style={{ color: colors.textDim, fontWeight: 500 }}>Rate Limit</span>
                <span style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.textSecondary }}>{p.rateLimit}</span>

                <span style={{ color: colors.textDim, fontWeight: 500 }}>Markets</span>
                <span style={{ color: colors.textSecondary }}>{p.supports.length > 0 ? p.supports.join(', ') : '—'}</span>
              </div>

              {p.note && (
                <div style={{
                  fontSize: 11,
                  color: colors.yellow,
                  marginTop: 10,
                  padding: '6px 8px',
                  borderRadius: 4,
                  background: colors.yellowDim,
                }}>
                  {p.note}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
