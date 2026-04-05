import { useState, useEffect } from 'react'
import { createMockVCProvider } from '@/vcflow/mock'
import { VC_SECTOR_CONFIGS, VC_DEAL_LABELS } from '@/vcflow/types'
import type { VCDeal, VCSector, VCDealType } from '@/vcflow/types'
import { fmtAge, fmtVol } from '@/utils/format'
import { isValidNumber } from '@/utils/math'
import { colors, fonts, card, sectionHeader, tagStyle, emptyState, statLabel, statValue } from '@/ui/theme'

// ─── DEAL CARD ──────────────────────────────────────────────

const DealCard = ({ deal }: { deal: VCDeal }) => {
  const sectorCfg = VC_SECTOR_CONFIGS[deal.sector]

  return (
    <div
      style={{
        ...card,
        padding: '12px 14px',
        borderLeft: `3px solid ${sectorCfg.color}`,
        marginBottom: 8,
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: colors.text }}>{deal.headline}</div>
          <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
            {deal.companyName} — {VC_DEAL_LABELS[deal.dealType]} — {deal.geo}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ ...tagStyle, color: sectorCfg.color, background: `${sectorCfg.color}15`, fontSize: 9 }}>
            {sectorCfg.label}
          </span>
          {deal.amount != null && (
            <span style={{ ...tagStyle, color: colors.green, background: `${colors.green}15`, fontSize: 9 }}>
              ${fmtVol(deal.amount)}
            </span>
          )}
        </div>
      </div>

      {/* Summary */}
      <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.5, marginBottom: 6 }}>
        {deal.summary}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: colors.textDim }}>
        <span>{fmtAge(deal.timestamp)}</span>
        <div style={{ display: 'flex', gap: 12 }}>
          {deal.investors.length > 0 && (
            <span>
              Lead: <span style={{ color: colors.textSecondary }}>{deal.investors.slice(0, 2).join(', ')}</span>
            </span>
          )}
          {deal.valuation != null && (
            <span>
              Valuation: <span style={{ fontFamily: fonts.mono, color: colors.accent }}>${fmtVol(deal.valuation)}</span>
            </span>
          )}
          {deal.relatedTickers.length > 0 && (
            <span>
              Tickers: <span style={{ fontFamily: fonts.mono, color: colors.yellow }}>{deal.relatedTickers.join(', ')}</span>
            </span>
          )}
          <span style={{ fontFamily: fonts.mono, color: colors.purple }}>{deal._status}</span>
        </div>
      </div>
    </div>
  )
}

// ─── SECTOR BAR CHART (simple CSS) ─────────────────────────

const SectorBreakdown = ({ deals }: { deals: VCDeal[] }) => {
  const sectorTotals: Record<string, number> = {}
  for (const d of deals) {
    sectorTotals[d.sector] = (sectorTotals[d.sector] ?? 0) + (d.amount ?? 0)
  }

  const sorted = Object.entries(sectorTotals)
    .sort((a, b) => b[1] - a[1])
    .filter(([, v]) => v > 0)

  const max = sorted.length > 0 ? sorted[0][1] : 1

  return (
    <div style={card}>
      <div style={sectionHeader}>Capital by Sector</div>
      {sorted.map(([sector, total]) => {
        const cfg = VC_SECTOR_CONFIGS[sector as VCSector]
        if (!cfg) return null
        return (
          <div key={sector} style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
              <span style={{ color: colors.textSecondary }}>{cfg.label}</span>
              <span style={{ fontFamily: fonts.mono, color: colors.text }}>${fmtVol(total)}</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: colors.border }}>
              <div
                style={{
                  height: '100%',
                  borderRadius: 2,
                  width: `${(total / max) * 100}%`,
                  background: cfg.color,
                  transition: 'width 0.3s',
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── KPI ────────────────────────────────────────────────────

const KPI = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div style={{ ...card, padding: '10px 14px', flex: 1, minWidth: 120 }}>
    <div style={statLabel}>{label}</div>
    <div style={{ ...statValue, color: color ?? colors.text, fontSize: 16 }}>{value}</div>
  </div>
)

// ─── MAIN SCREEN ────────────────────────────────────────────

export const VCFlow = () => {
  const [deals, setDeals] = useState<VCDeal[]>([])
  const [loading, setLoading] = useState(true)
  const [sectorFilter, setSectorFilter] = useState<VCSector | 'all'>('all')
  const [dealTypeFilter, setDealTypeFilter] = useState<VCDealType | 'all'>('all')

  useEffect(() => {
    const provider = createMockVCProvider()
    provider.getAllDeals().then((d) => {
      setDeals(d)
      setLoading(false)
    })
  }, [])

  const filtered = deals.filter((d) => {
    if (sectorFilter !== 'all' && d.sector !== sectorFilter) return false
    if (dealTypeFilter !== 'all' && d.dealType !== dealTypeFilter) return false
    return true
  })

  const totalCapital = deals.reduce((s, d) => s + (d.amount ?? 0), 0)
  const avgDealSize = deals.length > 0 ? totalCapital / deals.filter((d) => d.amount != null).length : 0
  const uniqueSectors = new Set(deals.map((d) => d.sector)).size

  const filterBtn = (label: string, active: boolean, onClick: () => void) => (
    <button
      onClick={onClick}
      style={{
        padding: '4px 10px',
        fontSize: 11,
        border: `1px solid ${active ? colors.accent : colors.border}`,
        borderRadius: 4,
        background: active ? `${colors.accent}18` : 'transparent',
        color: active ? colors.accent : colors.textMuted,
        cursor: 'pointer',
        fontFamily: fonts.sans,
        fontWeight: active ? 600 : 400,
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: colors.text }}>
          Venture Capital Flow
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.textMuted }}>
          {deals.length} deal{deals.length !== 1 ? 's' : ''} tracked across {uniqueSectors} sectors
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <KPI label="Total Capital" value={`$${fmtVol(totalCapital)}`} color={colors.green} />
        <KPI label="Deals" value={`${deals.length}`} />
        <KPI label="Avg Deal" value={isValidNumber(avgDealSize) ? `$${fmtVol(avgDealSize)}` : '—'} />
        <KPI label="Sectors" value={`${uniqueSectors}`} />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: colors.textDim, marginRight: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sector</span>
          {filterBtn('All', sectorFilter === 'all', () => setSectorFilter('all'))}
          {(['AI_ML', 'CYBERSECURITY', 'FINTECH', 'CLIMATE', 'BIOTECH', 'INFRASTRUCTURE', 'CRYPTO_WEB3'] as VCSector[]).map((s) =>
            filterBtn(VC_SECTOR_CONFIGS[s].label, sectorFilter === s, () => setSectorFilter(s))
          )}
        </div>

        <div style={{ width: 1, height: 20, background: colors.border }} />

        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: colors.textDim, marginRight: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Stage</span>
          {filterBtn('All', dealTypeFilter === 'all', () => setDealTypeFilter('all'))}
          {(['SEED', 'SERIES_A', 'SERIES_B', 'SERIES_C', 'GROWTH'] as VCDealType[]).map((dt) =>
            filterBtn(VC_DEAL_LABELS[dt], dealTypeFilter === dt, () => setDealTypeFilter(dt))
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14 }}>
        <div>
          {loading ? (
            <div style={emptyState}>Loading VC deals...</div>
          ) : filtered.length === 0 ? (
            <div style={emptyState}>No deals match the current filters</div>
          ) : (
            filtered.map((d) => <DealCard key={d.id} deal={d} />)
          )}
        </div>

        {/* Sidebar */}
        <div>
          <SectorBreakdown deals={deals} />
        </div>
      </div>

      {/* Data source */}
      <div style={{ marginTop: 16, padding: '8px 12px', background: `${colors.purple}08`, borderRadius: 6, border: `1px solid ${colors.purple}20` }}>
        <span style={{ fontSize: 10, color: colors.purple, fontFamily: fonts.mono }}>SIMULATED</span>
        <span style={{ fontSize: 11, color: colors.textDim, marginLeft: 8 }}>
          VC data is mock. Connect Crunchbase, PitchBook, or CB Insights adapters for live deal flow.
        </span>
      </div>
    </div>
  )
}
