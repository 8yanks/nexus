import { useMarketStore } from '@/store/market'
import { StatusBadge } from '@/ui/components/StatusBadge'
import { PriceChange } from '@/ui/components/PriceChange'
import { fmt } from '@/utils/format'
import { safeFixed } from '@/utils/math'
import { colors, fonts, radius, card, tagStyle, sectionHeader, emptyState } from '@/ui/theme'
import { ScreenHeader } from '@/ui/components/ScreenHeader'
import { SIGNAL_CONFIGS } from '@/signals/types'

export const Scanner = () => {
  const instruments = useMarketStore((s) => s.instruments)
  const snapshots = useMarketStore((s) => s.snapshots)
  const analytics = useMarketStore((s) => s.analytics)
  const signals = useMarketStore((s) => s.signals)
  const selectInstrument = useMarketStore((s) => s.selectInstrument)

  // Group signals by instrument
  const signalsByInst: Record<string, typeof signals> = {}
  for (const s of signals) {
    if (!signalsByInst[s.instrumentId]) signalsByInst[s.instrumentId] = []
    signalsByInst[s.instrumentId].push(s)
  }

  // Sort: instruments with most signals first
  const sorted = [...instruments].sort((a, b) => {
    const aCount = signalsByInst[a.id]?.length ?? 0
    const bCount = signalsByInst[b.id]?.length ?? 0
    return bCount - aCount
  })

  const withSignals = sorted.filter((i) => (signalsByInst[i.id]?.length ?? 0) > 0)
  const withoutSignals = sorted.filter((i) => (signalsByInst[i.id]?.length ?? 0) === 0)

  return (
    <>
      <ScreenHeader
        title="Signal Scanner"
        subtitle="Vue par instrument: signaux actifs détectés (techniques + corporate + macro), groupés et triés par densité de signaux."
        badge={
          <span
            style={{
              padding: '2px 8px',
              borderRadius: radius.badge,
              background: colors.bgHover,
              border: `1px solid ${colors.border}`,
              fontSize: 10,
              fontFamily: fonts.mono,
              color: signals.length > 0 ? colors.yellow : colors.textMuted,
              letterSpacing: '0.04em',
            }}
            data-testid="scanner-signals-badge"
          >
            {withSignals.length} inst · {signals.length} signal{signals.length !== 1 ? 's' : ''}
          </span>
        }
      />
      <div style={{ padding: '14px 20px' }}>
      {/* Active signals section */}
      {withSignals.length > 0 && (
        <>
          <div style={sectionHeader}>Active Signals</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10, marginBottom: 20 }}>
            {withSignals.map((inst) => {
              const snap = snapshots[inst.id]
              const a = analytics[inst.id]
              const sigs = signalsByInst[inst.id] ?? []
              const isForex = inst.assetClass === 'forex'

              return (
                <div
                  key={inst.id}
                  onClick={() => selectInstrument(inst.id)}
                  style={{
                    ...card,
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, background 0.15s',
                    borderLeft: `3px solid ${colors.accent}`,
                    padding: '12px 14px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = colors.bgHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = colors.bgCard)}
                >
                  {/* Top row: symbol + price */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, color: colors.text, fontSize: 14 }}>{inst.symbol}</span>
                      {snap && <StatusBadge status={snap._status} />}
                    </div>
                    <span style={{ fontFamily: fonts.mono, fontWeight: 600, color: colors.text, fontSize: 14 }}>
                      {snap ? fmt(snap.price, isForex ? 5 : 2) : '—'}
                    </span>
                  </div>

                  {/* Metrics row */}
                  <div style={{ display: 'flex', gap: 16, fontSize: 11, marginBottom: 8, color: colors.textMuted }}>
                    <span>
                      24h <PriceChange change={snap?.change24h ?? null} />
                    </span>
                    {a?.rsi != null && (
                      <span>
                        RSI{' '}
                        <span style={{
                          fontFamily: fonts.mono,
                          fontWeight: 600,
                          color: a.rsi > 70 ? colors.red : a.rsi < 30 ? colors.green : colors.textSecondary,
                        }}>
                          {safeFixed(a.rsi, 1)}
                        </span>
                      </span>
                    )}
                    {a?.relativeVolume != null && (
                      <span>
                        RVol{' '}
                        <span style={{
                          fontFamily: fonts.mono,
                          fontWeight: 600,
                          color: a.relativeVolume > 2.5 ? colors.yellow : colors.textSecondary,
                        }}>
                          {safeFixed(a.relativeVolume, 1)}x
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Signal tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {sigs.map((s) => {
                      const cfg = SIGNAL_CONFIGS[s.type]
                      const c = cfg.direction === 'bullish' ? colors.green : cfg.direction === 'bearish' ? colors.red : colors.yellow
                      return (
                        <span
                          key={s.id}
                          style={{
                            ...tagStyle,
                            color: c,
                            background: `${c}15`,
                            fontSize: 10,
                          }}
                        >
                          {s.type.replace(/_/g, ' ')}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Quiet instruments */}
      {withoutSignals.length > 0 && (
        <>
          <div style={sectionHeader}>Quiet</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {withoutSignals.map((inst) => {
              const snap = snapshots[inst.id]
              return (
                <div
                  key={inst.id}
                  onClick={() => selectInstrument(inst.id)}
                  style={{
                    ...card,
                    cursor: 'pointer',
                    padding: '8px 12px',
                    opacity: 0.6,
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: colors.textSecondary, fontSize: 12 }}>{inst.symbol}</span>
                    <span style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.textDim }}>
                      {snap ? fmt(snap.price, inst.assetClass === 'forex' ? 5 : 2) : '—'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {signals.length === 0 && (
        <div style={emptyState}>No signals detected across any instruments</div>
      )}
      </div>
    </>
  )
}
