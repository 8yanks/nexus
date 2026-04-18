import { useMarketStore } from '@/store/market'
import { StatusBadge } from '@/ui/components/StatusBadge'
import { FreshnessDot } from '@/ui/components/FreshnessDot'
import { PriceChange } from '@/ui/components/PriceChange'
import { MiniChart } from '@/ui/components/MiniChart'
import { QualityBar } from '@/ui/components/QualityBar'
import { ScreenHeader } from '@/ui/components/ScreenHeader'
import { fmt, fmtVol, fmtAge } from '@/utils/format'
import { ASSET_CLASS_LABELS, ASSET_CLASS_COLORS } from '@/utils/format'
import { colors, fonts, radius, card, thStyle, tdStyle, monoTd, statValue, statLabel } from '@/ui/theme'
import { safeFixed } from '@/utils/math'

// ─── STAT CARD (top row KPIs) ───────────────────────────────

const KPI = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div style={{ ...card, padding: '12px 16px', flex: 1, minWidth: 130 }}>
    <div style={statLabel}>{label}</div>
    <div style={{ ...statValue, color: color ?? colors.text, fontSize: 18 }}>{value}</div>
  </div>
)

export const Dashboard = () => {
  const instruments = useMarketStore((s) => s.instruments)
  const snapshots = useMarketStore((s) => s.snapshots)
  const candles = useMarketStore((s) => s.candles)
  const quality = useMarketStore((s) => s.quality)
  const readiness = useMarketStore((s) => s.readiness)
  const lastRefresh = useMarketStore((s) => s.lastRefresh)
  const signals = useMarketStore((s) => s.signals)
  const selectInstrument = useMarketStore((s) => s.selectInstrument)

  // Top-level KPIs
  const liveCount = Object.values(snapshots).filter((s) => s._status === 'LIVE').length
  const simCount = Object.values(snapshots).filter((s) => s._status === 'SIMULATED').length
  const totalSignals = signals.length

  return (
    <>
      <ScreenHeader
        title="Market Dashboard"
        subtitle="Vue d'ensemble — instruments suivis, snapshots live/simulés, signaux actifs et qualité agrégée."
        badge={
          <span
            style={{
              padding: '2px 8px',
              borderRadius: radius.badge,
              background: colors.bgHover,
              border: `1px solid ${colors.border}`,
              fontSize: 10,
              fontFamily: fonts.mono,
              color: colors.textMuted,
              letterSpacing: '0.04em',
            }}
            data-testid="dashboard-refresh-badge"
          >
            {lastRefresh ? `updated ${fmtAge(lastRefresh)}` : 'initializing'}
          </span>
        }
        actions={
          readiness ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Bot Readiness
              </span>
              <QualityBar score={readiness.score} width={64} />
              <span
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 11,
                  fontWeight: 700,
                  color: readiness.ready ? colors.green : colors.red,
                }}
                data-testid="dashboard-readiness-label"
              >
                {readiness.ready ? 'READY' : 'NOT READY'}
              </span>
            </div>
          ) : undefined
        }
      />
      <div style={{ padding: '14px 20px' }}>
      {/* KPI strip */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <KPI label="Instruments" value={`${instruments.length}`} />
        <KPI label="Live Feeds" value={`${liveCount}`} color={liveCount > 0 ? colors.green : colors.textDim} />
        <KPI label="Simulated" value={`${simCount}`} color={simCount > 0 ? colors.purple : colors.textDim} />
        <KPI label="Active Signals" value={`${totalSignals}`} color={totalSignals > 0 ? colors.yellow : colors.textDim} />
        <KPI label="Avg Quality" value={
          instruments.length > 0
            ? `${safeFixed(
                (Object.values(quality).reduce((s, q) => s + (q?.overallScore ?? 0), 0) / instruments.length) * 100,
                0,
              )}%`
            : '—'
        } />
      </div>

      {/* Watchlist Table */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: fonts.sans }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 28, padding: '10px 8px' }}></th>
              <th style={thStyle}>Instrument</th>
              <th style={thStyle}>Class</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Price</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>24h</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Volume</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Trend</th>
              <th style={{ ...thStyle, textAlign: 'center', width: 60 }}>Quality</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {instruments.map((inst, idx) => {
              const snap = snapshots[inst.id]
              const series = candles[inst.id]
              const q = quality[inst.id]
              const closes = series?.candles.slice(-30).map((c) => c.close) ?? []
              const isForex = inst.assetClass === 'forex'
              const rowBg = idx % 2 === 0 ? colors.bgTableRow : colors.bgTableRowAlt

              return (
                <tr
                  key={inst.id}
                  onClick={() => selectInstrument(inst.id)}
                  style={{ cursor: 'pointer', background: rowBg, transition: 'background 0.1s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = colors.bgHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}
                >
                  <td style={{ ...tdStyle, padding: '8px', textAlign: 'center' }}>
                    <FreshnessDot timestamp={snap?._provenance.timestamp} />
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, color: colors.text, fontSize: 13 }}>{inst.symbol}</span>
                      <span style={{ fontSize: 10, color: colors.textDim, marginTop: 1 }}>{inst.exchange}</span>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: ASSET_CLASS_COLORS[inst.assetClass],
                      background: `${ASSET_CLASS_COLORS[inst.assetClass]}15`,
                      padding: '2px 6px',
                      borderRadius: 3,
                      letterSpacing: '0.02em',
                    }}>
                      {ASSET_CLASS_LABELS[inst.assetClass]}
                    </span>
                  </td>
                  <td style={{ ...monoTd, textAlign: 'right', fontWeight: 600, fontSize: 13 }}>
                    {snap ? fmt(snap.price, isForex ? 5 : 2) : '—'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <PriceChange
                      change={snap?.change24h ?? null}
                      title="Rolling 24h change from source exchange. May differ from TradingView/Google daily windows."
                    />
                  </td>
                  <td style={{ ...monoTd, textAlign: 'right', color: colors.textSecondary, fontSize: 12 }}>
                    {snap ? fmtVol(snap.volume24h) : '—'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <MiniChart data={closes} />
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {q ? <QualityBar score={q.overallScore} width={48} /> : <span style={{ color: colors.textDim, fontSize: 10 }}>—</span>}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {snap ? <StatusBadge status={snap._status} /> : <span style={{ color: colors.textDim, fontSize: 10 }}>N/A</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      </div>
    </>
  )
}
