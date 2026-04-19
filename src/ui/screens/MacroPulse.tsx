import { useState, useEffect } from 'react'
import { createMockMacroProvider } from '@/macro/mock'
import { MACRO_CATEGORY_CONFIGS } from '@/macro/types'
import type { MacroIndicator, MacroCalendarEvent, MacroCategory } from '@/macro/types'
import { fmtAge, fmtDate } from '@/utils/format'
import { safeFixed, isValidNumber } from '@/utils/math'
import { colors, fonts, radius, card, sectionHeader, tagStyle, emptyState, thStyle, tdStyle, monoTd, statLabel, statValue } from '@/ui/theme'
import { ScreenHeader } from '@/ui/components/ScreenHeader'

// ─── INDICATOR ROW ──────────────────────────────────────────

const IndicatorRow = ({ ind }: { ind: MacroIndicator }) => {
  const catCfg = MACRO_CATEGORY_CONFIGS[ind.category]
  const trendColor = ind.trend === 'rising' ? colors.green : ind.trend === 'falling' ? colors.red : colors.textDim
  const trendArrow = ind.trend === 'rising' ? '\u25B2' : ind.trend === 'falling' ? '\u25BC' : '\u25CF'

  return (
    <tr>
      <td style={tdStyle}>
        <div>
          <span style={{ fontWeight: 600, fontSize: 13, color: colors.text }}>{ind.shortName}</span>
          <div style={{ fontSize: 10, color: colors.textDim, marginTop: 1 }}>{ind.name}</div>
        </div>
      </td>
      <td style={tdStyle}>
        <span style={{ ...tagStyle, color: catCfg.color, background: `${catCfg.color}15`, fontSize: 9 }}>
          {catCfg.label}
        </span>
      </td>
      <td style={{ ...monoTd, textAlign: 'right', fontWeight: 700, fontSize: 14 }}>
        {safeFixed(ind.value, ind.unit === 'K' || ind.unit === 'M' ? 0 : 2)}
        <span style={{ fontSize: 10, color: colors.textDim, marginLeft: 2 }}>{ind.unit}</span>
      </td>
      <td style={{ ...monoTd, textAlign: 'right' }}>
        {safeFixed(ind.previousValue, ind.unit === 'K' || ind.unit === 'M' ? 0 : 2)}
      </td>
      <td style={{ ...monoTd, textAlign: 'right', color: trendColor }}>
        <span style={{ marginRight: 4, fontSize: 8 }}>{trendArrow}</span>
        {isValidNumber(ind.changePct)
          ? `${ind.changePct >= 0 ? '+' : ''}${(ind.changePct * 100).toFixed(2)}%`
          : '—'}
      </td>
      <td style={{ ...tdStyle, textAlign: 'center' }}>
        <span style={{
          ...tagStyle,
          fontSize: 9,
          color: ind.impact === 'high' ? colors.red : ind.impact === 'medium' ? colors.yellow : colors.textDim,
          background: ind.impact === 'high' ? `${colors.red}15` : ind.impact === 'medium' ? `${colors.yellow}15` : `${colors.textDim}15`,
        }}>
          {ind.impact.toUpperCase()}
        </span>
      </td>
      <td style={{ ...tdStyle, textAlign: 'center', fontSize: 10, color: colors.textDim }}>
        {ind.region}
      </td>
      <td style={{ ...tdStyle, fontSize: 10, color: colors.textDim }}>
        {fmtAge(ind.lastUpdate)}
      </td>
    </tr>
  )
}

// ─── CALENDAR EVENT ROW ─────────────────────────────────────

const CalendarRow = ({ event }: { event: MacroCalendarEvent }) => {
  const isPast = new Date(event.scheduledAt).getTime() < Date.now()
  const impactColor = event.impact === 'high' ? colors.red : event.impact === 'medium' ? colors.yellow : colors.textDim
  const surpriseColor = event.surprise != null
    ? event.surprise > 0 ? colors.green : event.surprise < 0 ? colors.red : colors.textDim
    : colors.textDim

  return (
    <tr style={{ opacity: isPast ? 0.7 : 1 }}>
      <td style={{ ...tdStyle, fontSize: 11 }}>
        {fmtDate(event.scheduledAt)}
        {isPast && <span style={{ fontSize: 9, color: colors.textDim, marginLeft: 4 }}>PAST</span>}
      </td>
      <td style={{ ...tdStyle, fontWeight: 600 }}>{event.name}</td>
      <td style={{ ...tdStyle, textAlign: 'center', fontSize: 10 }}>{event.region}</td>
      <td style={{ ...tdStyle, textAlign: 'center' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: impactColor, display: 'inline-block' }} />
      </td>
      <td style={{ ...monoTd, textAlign: 'right', color: colors.textMuted }}>
        {event.forecast != null ? safeFixed(event.forecast, 1) : '—'}
      </td>
      <td style={{ ...monoTd, textAlign: 'right', color: colors.textMuted }}>
        {event.previous != null ? safeFixed(event.previous, 1) : '—'}
      </td>
      <td style={{ ...monoTd, textAlign: 'right', fontWeight: 600, color: event.actual != null ? colors.text : colors.textDim }}>
        {event.actual != null ? safeFixed(event.actual, 1) : '—'}
      </td>
      <td style={{ ...monoTd, textAlign: 'right', color: surpriseColor, fontWeight: 600 }}>
        {event.surprise != null
          ? `${event.surprise >= 0 ? '+' : ''}${safeFixed(event.surprise, 1)}`
          : '—'}
      </td>
    </tr>
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

export const MacroPulse = () => {
  const [indicators, setIndicators] = useState<MacroIndicator[]>([])
  const [calendar, setCalendar] = useState<MacroCalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<MacroCategory | 'all'>('all')

  useEffect(() => {
    const provider = createMockMacroProvider()
    Promise.all([provider.getIndicators(), provider.getCalendar()]).then(([ind, cal]) => {
      setIndicators(ind)
      setCalendar(cal)
      setLoading(false)
    })
  }, [])

  const filtered = categoryFilter === 'all'
    ? indicators
    : indicators.filter((i) => i.category === categoryFilter)

  // Key macro KPIs
  const ffr = indicators.find((i) => i.shortName === 'FFR')
  const cpi = indicators.find((i) => i.shortName === 'CPI')
  const vix = indicators.find((i) => i.shortName === 'VIX')
  const dxy = indicators.find((i) => i.shortName === 'DXY')
  const nfp = indicators.find((i) => i.shortName === 'NFP')

  const upcomingEvents = calendar.filter((e) => new Date(e.scheduledAt).getTime() > Date.now())
  const pastEvents = calendar.filter((e) => new Date(e.scheduledAt).getTime() <= Date.now())

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

  if (loading) {
    return (
      <>
        <ScreenHeader
          title="Macro Pulse"
          subtitle="Indicateurs macro (FFR, CPI, VIX, DXY, NFP) + calendrier des events. Source mock — adapters FRED / Trading Economics / Investing.com pour live."
        />
        <div style={{ padding: '14px 20px' }}>
          <div style={emptyState}>Loading macro data...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <ScreenHeader
        title="Macro Pulse"
        subtitle="Indicateurs macro (FFR, CPI, VIX, DXY, NFP) + calendrier des events. Source mock — adapters FRED / Trading Economics / Investing.com pour live."
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
            data-testid="macro-counts-badge"
          >
            {indicators.length} ind · {upcomingEvents.length} upcoming
          </span>
        }
      />
      <div style={{ padding: '14px 20px' }}>
      {/* Key KPI strip */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <KPI label="Fed Funds" value={ffr ? `${safeFixed(ffr.value, 2)}%` : '—'} color={colors.accent} />
        <KPI label="CPI YoY" value={cpi ? `${safeFixed(cpi.value, 1)}%` : '—'}
          color={cpi && cpi.value > 3 ? colors.red : colors.green} />
        <KPI label="VIX" value={vix ? safeFixed(vix.value, 1) : '—'}
          color={vix && vix.value > 20 ? colors.red : vix && vix.value > 15 ? colors.yellow : colors.green} />
        <KPI label="DXY" value={dxy ? safeFixed(dxy.value, 1) : '—'} />
        <KPI label="NFP" value={nfp ? `${safeFixed(nfp.value, 0)}K` : '—'}
          color={nfp && nfp.value > 200 ? colors.green : colors.yellow} />
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: colors.textDim, marginRight: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Category</span>
        {filterBtn('All', categoryFilter === 'all', () => setCategoryFilter('all'))}
        {(Object.keys(MACRO_CATEGORY_CONFIGS) as MacroCategory[]).map((cat) =>
          filterBtn(MACRO_CATEGORY_CONFIGS[cat].label, categoryFilter === cat, () => setCategoryFilter(cat))
        )}
      </div>

      {/* Indicators table */}
      <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: fonts.sans }}>
          <thead>
            <tr>
              <th style={thStyle}>Indicator</th>
              <th style={thStyle}>Category</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Value</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Previous</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Change</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Impact</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Region</th>
              <th style={thStyle}>Updated</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((ind) => <IndicatorRow key={ind.id} ind={ind} />)}
          </tbody>
        </table>
      </div>

      {/* Economic Calendar */}
      <div style={sectionHeader}>Economic Calendar</div>
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: fonts.sans }}>
          <thead>
            <tr>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Event</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Region</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Impact</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Forecast</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Previous</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Actual</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Surprise</th>
            </tr>
          </thead>
          <tbody>
            {[...pastEvents.slice(-3), ...upcomingEvents].map((ev) => (
              <CalendarRow key={ev.id} event={ev} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Data source */}
      <div style={{ marginTop: 16, padding: '8px 12px', background: `${colors.purple}08`, borderRadius: 6, border: `1px solid ${colors.purple}20` }}>
        <span style={{ fontSize: 10, color: colors.purple, fontFamily: fonts.mono }}>SIMULATED</span>
        <span style={{ fontSize: 11, color: colors.textDim, marginLeft: 8 }}>
          Macro data is mock. Connect FRED, Trading Economics, or Investing.com adapters for live feeds.
        </span>
      </div>
      </div>
    </>
  )
}
