import { useEffect, useRef, useState } from 'react'
import { useMarketStore } from '@/store/market'
import { colors, fonts } from '@/ui/theme'

// ─── STATUS BAR — viewport-bottom system strip ──────────────
//
// Slim 22px-tall bar that sits at the bottom of the app, mirroring
// IDE-style status bars (VSCode, IntelliJ): always-visible, mono,
// dense, glanceable. Shows the four health signals the user cares
// about most:
//
//   • how many feeds are LIVE right now (snapshots whose latest
//     status === 'LIVE')
//   • how many are SIMULATED (mock/fallback path)
//   • the running signal count
//   • how long ago the store last refreshed
//   • analyst bot online state
//
// All values are derived from useMarketStore — no separate state.
// `refreshedAgo` re-renders every second via a tiny interval so the
// "Xs ago" stays honest without churning the rest of the app.

const fmtAgo = (iso: string | null, nowMs: number): string => {
  if (!iso) return 'NEVER'
  const ms = nowMs - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return 'NEVER'
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s AGO`
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m AGO`
  return `${Math.floor(ms / 3_600_000)}h AGO`
}

export const StatusBar = () => {
  const snapshots = useMarketStore((s) => s.snapshots)
  const signalsCount = useMarketStore((s) => s.signals.length)
  const lastRefresh = useMarketStore((s) => s.lastRefresh)
  const refreshAll = useMarketStore((s) => s.refreshAll)

  // Tick the "Xs ago" label without re-rendering the whole tree. The
  // store updates lastRefresh every refresh cycle anyway; this just
  // keeps the displayed delta fresh between cycles.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // ── Manual refresh button ─────────────────────────────────
  // Click → fire a refreshAll. Visual feedback via `refreshing`
  // flag (debounced through the in-flight ref so a fat double-click
  // doesn't hammer the providers).
  const [refreshing, setRefreshing] = useState(false)
  const inFlight = useRef(false)
  const triggerRefresh = async () => {
    if (inFlight.current) return
    inFlight.current = true
    setRefreshing(true)
    try {
      await refreshAll()
    } finally {
      inFlight.current = false
      setRefreshing(false)
    }
  }

  const snapList = Object.values(snapshots)
  const liveFeeds = snapList.filter((s) => s._status === 'LIVE').length
  const simulated = snapList.filter((s) => s._status === 'SIMULATED').length

  const item: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    color: colors.textMuted,
  }
  const dot = (color: string): React.CSSProperties => ({
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: color,
    flexShrink: 0,
  })

  return (
    <div
      role="status"
      aria-label="System status"
      style={{
        height: 22,
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        padding: '0 16px',
        background: colors.bg,
        borderTop: `1px solid ${colors.border}`,
        fontFamily: fonts.mono,
        fontSize: 9.5,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      <span style={item}>
        <span style={dot(colors.green)} />
        <span style={{ color: colors.green }}>{liveFeeds} LIVE FEEDS</span>
      </span>
      <span style={item}>
        <span style={{ color: colors.purple }}>{simulated} SIMULATED</span>
      </span>
      <span style={item}>
        <span style={{ color: colors.yellow }}>{signalsCount} SIGNALS</span>
      </span>
      <button
        type="button"
        onClick={triggerRefresh}
        disabled={refreshing}
        title={refreshing ? 'Refresh in progress…' : 'Refresh data now'}
        data-testid="status-bar-refresh"
        style={{
          ...item,
          background: 'transparent',
          border: 'none',
          padding: '2px 4px',
          cursor: refreshing ? 'wait' : 'pointer',
          fontFamily: fonts.mono,
          fontSize: 9.5,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: refreshing ? colors.cyan : colors.textMuted,
        }}
      >
        {refreshing ? '↻ REFRESHING…' : `REFRESHED ${fmtAgo(lastRefresh, now)}`}
      </button>
      <span style={{ ...item, marginLeft: 'auto' }}>
        ANALYST BOT
        <span style={dot(colors.cyan)} />
        <span style={{ color: colors.cyan }}>ONLINE</span>
      </span>
    </div>
  )
}
