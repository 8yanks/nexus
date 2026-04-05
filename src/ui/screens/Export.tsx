import { Download, FileText, FileJson, Package } from 'lucide-react'
import { useMarketStore } from '@/store/market'
import { snapshotsToCSV, downloadCSV } from '@/export/csv'
import { buildExportPayload, downloadJSON } from '@/export/json'
import { getJournal } from '@/signals/journal'
import { colors, fonts, card, btnPrimary, sectionHeader, statLabel, statValue, emptyState } from '@/ui/theme'

export const Export = () => {
  const instruments = useMarketStore((s) => s.instruments)
  const snapshots = useMarketStore((s) => s.snapshots)
  const analytics = useMarketStore((s) => s.analytics)
  const quality = useMarketStore((s) => s.quality)

  const handleCSV = () => {
    const csv = snapshotsToCSV(instruments, snapshots)
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    downloadCSV(`nexus-snapshot-${ts}.csv`, csv)
  }

  const handleJSON = () => {
    const payload = buildExportPayload(
      instruments,
      snapshots,
      analytics,
      [...getJournal()],
      quality,
    )
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    downloadJSON(`nexus-export-${ts}.json`, payload)
  }

  const snapshotCount = Object.keys(snapshots).length
  const signalCount = getJournal().length

  return (
    <div style={{ padding: '16px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Download size={18} style={{ color: colors.accent }} />
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: colors.text, fontFamily: fonts.sans }}>
          Export Data
        </h1>
      </div>

      {/* Status + Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {/* Status */}
        <div style={card}>
          <div style={sectionHeader}>Available Data</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 10 }}>
            {[
              { label: 'Snapshots', value: String(snapshotCount), icon: <Package size={14} /> },
              { label: 'Instruments', value: String(instruments.length), icon: <FileText size={14} /> },
              { label: 'Signals', value: String(signalCount), icon: <FileJson size={14} /> },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ color: colors.textDim, marginBottom: 4 }}>{s.icon}</div>
                <div style={statValue}>{s.value}</div>
                <div style={statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={card}>
          <div style={sectionHeader}>Export Actions</div>
          {snapshotCount === 0 ? (
            <div style={emptyState}>No data loaded yet — wait for first refresh.</div>
          ) : (
            <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
              <button style={btnPrimary} onClick={handleCSV}>
                <FileText size={15} />
                Export CSV
              </button>
              <button
                style={{ ...btnPrimary, background: colors.purple }}
                onClick={handleJSON}
              >
                <FileJson size={15} />
                Export JSON
              </button>
            </div>
          )}
        </div>
      </div>

      {/* What's included */}
      <div style={card}>
        <div style={sectionHeader}>What's included in exports</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
          {[
            'All instrument snapshots with provenance metadata',
            'Analytics results (EMA, RSI, ATR, Bollinger, VWAP)',
            'Signal journal (technical + corporate + macro)',
            'Data quality reports per instrument',
            'CSV: flat table — one row per instrument',
            'JSON: full nested structure with all metadata',
          ].map((item, i) => (
            <div
              key={i}
              style={{
                fontSize: 12,
                color: colors.textSecondary,
                padding: '6px 10px',
                borderRadius: 4,
                background: colors.bgTableRow,
                borderLeft: `2px solid ${colors.accent}30`,
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
