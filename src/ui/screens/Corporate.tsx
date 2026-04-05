import { useState, useEffect } from 'react'
import { useMarketStore } from '@/store/market'
import { createMockCorporateProvider } from '@/corporate/mock'
import { CORPORATE_EVENT_CONFIGS } from '@/corporate/types'
import type { CorporateEvent, CorporateEventType, CorporateBias, CorporatePriority } from '@/corporate/types'
import { fmtAge, fmtTime } from '@/utils/format'
import { colors, fonts, card, sectionHeader, tagStyle, emptyState, thStyle, tdStyle } from '@/ui/theme'

// ─── CONSTANTS ──────────────────────────────────────────────

const BIAS_COLORS: Record<CorporateBias, string> = {
  bullish: colors.green,
  bearish: colors.red,
  neutral: colors.textMuted,
}

const PRIORITY_COLORS: Record<CorporatePriority, string> = {
  high: colors.red,
  medium: colors.yellow,
  low: colors.textDim,
}

// Equity instruments only
const EQUITY_IDS = ['aapl', 'msft', 'tsla', 'nvda']

// ─── FILTER BAR ─────────────────────────────────────────────

const FilterBar = ({
  selectedInstrument,
  setSelectedInstrument,
  selectedBias,
  setSelectedBias,
  selectedPriority,
  setSelectedPriority,
}: {
  selectedInstrument: string
  setSelectedInstrument: (s: string) => void
  selectedBias: CorporateBias | 'all'
  setSelectedBias: (s: CorporateBias | 'all') => void
  selectedPriority: CorporatePriority | 'all'
  setSelectedPriority: (s: CorporatePriority | 'all') => void
}) => {
  const instruments = useMarketStore((s) => s.instruments)
  const equities = instruments.filter((i) => EQUITY_IDS.includes(i.id))

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
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
      {/* Instrument filter */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: colors.textDim, marginRight: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ticker</span>
        {filterBtn('All', selectedInstrument === 'all', () => setSelectedInstrument('all'))}
        {equities.map((i) => filterBtn(i.symbol, selectedInstrument === i.id, () => setSelectedInstrument(i.id)))}
      </div>

      <div style={{ width: 1, height: 20, background: colors.border }} />

      {/* Bias filter */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: colors.textDim, marginRight: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bias</span>
        {filterBtn('All', selectedBias === 'all', () => setSelectedBias('all'))}
        {(['bullish', 'bearish', 'neutral'] as const).map((b) => filterBtn(b, selectedBias === b, () => setSelectedBias(b)))}
      </div>

      <div style={{ width: 1, height: 20, background: colors.border }} />

      {/* Priority filter */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: colors.textDim, marginRight: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Priority</span>
        {filterBtn('All', selectedPriority === 'all', () => setSelectedPriority('all'))}
        {(['high', 'medium', 'low'] as const).map((p) => filterBtn(p, selectedPriority === p, () => setSelectedPriority(p)))}
      </div>
    </div>
  )
}

// ─── EVENT CARD ─────────────────────────────────────────────

const EventCard = ({ event }: { event: CorporateEvent }) => {
  const cfg = CORPORATE_EVENT_CONFIGS[event.type]
  const biasColor = BIAS_COLORS[event.bias]
  const priColor = PRIORITY_COLORS[event.priority]

  return (
    <div
      style={{
        ...card,
        padding: '12px 14px',
        borderLeft: `3px solid ${biasColor}`,
        marginBottom: 8,
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{cfg.icon}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: colors.text }}>{event.headline}</div>
            <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
              {event.instrumentId.toUpperCase()} — {cfg.label}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ ...tagStyle, color: biasColor, background: `${biasColor}15`, fontSize: 9 }}>
            {event.bias.toUpperCase()}
          </span>
          <span style={{ ...tagStyle, color: priColor, background: `${priColor}15`, fontSize: 9 }}>
            {event.priority.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Summary */}
      <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.5, marginBottom: 6 }}>
        {event.summary}
      </div>

      {/* Footer: timestamp + impact + source */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
        <span style={{ color: colors.textDim }}>
          {fmtAge(event.timestamp)} — {fmtTime(event.timestamp)}
        </span>
        <div style={{ display: 'flex', gap: 12, color: colors.textDim }}>
          <span>Impact: <span style={{ fontFamily: fonts.mono, color: event.impactScore > 0.7 ? colors.yellow : colors.textMuted }}>{(event.impactScore * 100).toFixed(0)}%</span></span>
          <span>Confidence: <span style={{ fontFamily: fonts.mono }}>{(event.confidence * 100).toFixed(0)}%</span></span>
          <span style={{ fontFamily: fonts.mono, color: colors.purple }}>{event._status}</span>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN SCREEN ────────────────────────────────────────────

export const Corporate = () => {
  const [events, setEvents] = useState<CorporateEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInstrument, setSelectedInstrument] = useState<string>('all')
  const [selectedBias, setSelectedBias] = useState<CorporateBias | 'all'>('all')
  const [selectedPriority, setSelectedPriority] = useState<CorporatePriority | 'all'>('all')

  useEffect(() => {
    const provider = createMockCorporateProvider()
    provider.getAllEvents().then((ev) => {
      setEvents(ev)
      setLoading(false)
    })
  }, [])

  // Apply filters
  const filtered = events.filter((e) => {
    if (selectedInstrument !== 'all' && e.instrumentId !== selectedInstrument) return false
    if (selectedBias !== 'all' && e.bias !== selectedBias) return false
    if (selectedPriority !== 'all' && e.priority !== selectedPriority) return false
    return true
  })

  // Summary stats
  const bullishCount = events.filter((e) => e.bias === 'bullish').length
  const bearishCount = events.filter((e) => e.bias === 'bearish').length
  const highPriority = events.filter((e) => e.priority === 'high').length

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: colors.text }}>
          Corporate Intelligence
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.textMuted }}>
          {events.length} event{events.length !== 1 ? 's' : ''} tracked —{' '}
          <span style={{ color: colors.green }}>{bullishCount} bullish</span>,{' '}
          <span style={{ color: colors.red }}>{bearishCount} bearish</span>,{' '}
          <span style={{ color: colors.yellow }}>{highPriority} high priority</span>
        </p>
      </div>

      <FilterBar
        selectedInstrument={selectedInstrument}
        setSelectedInstrument={setSelectedInstrument}
        selectedBias={selectedBias}
        setSelectedBias={setSelectedBias}
        selectedPriority={selectedPriority}
        setSelectedPriority={setSelectedPriority}
      />

      {loading ? (
        <div style={emptyState}>Loading corporate events...</div>
      ) : filtered.length === 0 ? (
        <div style={emptyState}>No events match the current filters</div>
      ) : (
        <div>
          {filtered.map((ev) => (
            <EventCard key={ev.id} event={ev} />
          ))}
        </div>
      )}

      {/* Data source disclaimer */}
      <div style={{ marginTop: 16, padding: '8px 12px', background: `${colors.purple}08`, borderRadius: 6, border: `1px solid ${colors.purple}20` }}>
        <span style={{ fontSize: 10, color: colors.purple, fontFamily: fonts.mono }}>SIMULATED</span>
        <span style={{ fontSize: 11, color: colors.textDim, marginLeft: 8 }}>
          Corporate events are mock data. Connect Polygon.io, Finnhub, or EODHD adapters for live feeds.
        </span>
      </div>
    </div>
  )
}
