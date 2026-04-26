import { useState, useCallback, lazy, Suspense } from 'react'
import { useMarketStore } from '@/store/market'
import { useMarketData } from '@/hooks/useMarketData'
import { Sidebar } from '@/ui/components/Sidebar'
import { TopBar } from '@/ui/components/TopBar'
import { StatusBar } from '@/ui/components/StatusBar'
import { DemoSplash } from '@/ui/components/DemoSplash'
import { ErrorBoundary } from '@/ui/components/ErrorBoundary'
import { CookieConsent } from '@/ui/components/CookieConsent'
import { KeybindHelp } from '@/ui/components/KeybindHelp'
import { colors, fonts } from '@/ui/theme'

// ─── LAZY-LOADED SCREENS ────────────────────────────────────
// Each screen ships in its own chunk. The initial bundle used to carry
// every screen (Recharts included) at ~775 kB; lazy splitting keeps the
// entry chunk small and loads each screen on first visit.
//
// Screens export named components (e.g. `Dashboard`). React.lazy requires
// a module with `default`, so each import is mapped via `.then`.
const Dashboard = lazy(() =>
  import('@/ui/screens/Dashboard').then((m) => ({ default: m.Dashboard })),
)
const Detail = lazy(() =>
  import('@/ui/screens/Detail').then((m) => ({ default: m.Detail })),
)
const Scanner = lazy(() =>
  import('@/ui/screens/Scanner').then((m) => ({ default: m.Scanner })),
)
const Alerts = lazy(() =>
  import('@/ui/screens/Alerts').then((m) => ({ default: m.Alerts })),
)
const Quality = lazy(() =>
  import('@/ui/screens/Quality').then((m) => ({ default: m.Quality })),
)
const Sources = lazy(() =>
  import('@/ui/screens/Sources').then((m) => ({ default: m.Sources })),
)
const Export = lazy(() =>
  import('@/ui/screens/Export').then((m) => ({ default: m.Export })),
)
const Journal = lazy(() =>
  import('@/ui/screens/Journal').then((m) => ({ default: m.Journal })),
)
const Correlation = lazy(() =>
  import('@/ui/screens/Correlation').then((m) => ({ default: m.Correlation })),
)
const Backtest = lazy(() =>
  import('@/ui/screens/Backtest').then((m) => ({ default: m.Backtest })),
)
const Corporate = lazy(() =>
  import('@/ui/screens/Corporate').then((m) => ({ default: m.Corporate })),
)
const VCFlow = lazy(() =>
  import('@/ui/screens/VCFlow').then((m) => ({ default: m.VCFlow })),
)
const MacroPulse = lazy(() =>
  import('@/ui/screens/MacroPulse').then((m) => ({ default: m.MacroPulse })),
)
const ChainMonitor = lazy(() =>
  import('@/ui/screens/ChainMonitor').then((m) => ({ default: m.ChainMonitor })),
)
const Sentinel = lazy(() =>
  import('@/ui/screens/Sentinel').then((m) => ({ default: m.Sentinel })),
)
const Trader = lazy(() =>
  import('@/ui/screens/Trader').then((m) => ({ default: m.Trader })),
)
const Options = lazy(() =>
  import('@/ui/screens/Options').then((m) => ({ default: m.Options })),
)
const Legal = lazy(() =>
  import('@/ui/screens/Legal').then((m) => ({ default: m.Legal })),
)

const ScreenLoading = () => (
  <div
    style={{
      padding: 32,
      color: colors.textMuted,
      fontFamily: fonts.mono,
      fontSize: 12,
    }}
  >
    loading…
  </div>
)

const ScreenRouter = () => {
  const screen = useMarketStore((s) => s.screen)
  switch (screen) {
    case 'dashboard': return <Dashboard />
    case 'detail':    return <Detail />
    case 'scanner':   return <Scanner />
    case 'alerts':    return <Alerts />
    case 'quality':   return <Quality />
    case 'sources':   return <Sources />
    case 'export':    return <Export />
    case 'correlation': return <Correlation />
    case 'journal':   return <Journal />
    case 'backtest':  return <Backtest />
    case 'corporate': return <Corporate />
    case 'vcflow':    return <VCFlow />
    case 'macro':     return <MacroPulse />
    case 'chain':     return <ChainMonitor />
    case 'sentinel': return <Sentinel />
    case 'trader':   return <Trader />
    case 'options':  return <Options />
    case 'legal':    return <Legal />
  }
}

function App() {
  // Start auto-refresh on mount
  useMarketData()

  const [showSplash, setShowSplash] = useState(
    () => !sessionStorage.getItem('nexus_splash_dismissed'),
  )

  const dismissSplash = useCallback(() => {
    sessionStorage.setItem('nexus_splash_dismissed', '1')
    setShowSplash(false)
  }, [])

  // ─── LAYOUT — v3 redesign shell ───────────────────────────
  // Two-column: vertical Sidebar on the left, then a flex-column with
  // the slim TopBar on top, the routed screen filling the middle, and
  // the StatusBar pinned at the bottom of the viewport. The middle
  // <main> scrolls independently so the chrome stays sticky.
  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.bg,
        color: colors.text,
        fontFamily: fonts.sans,
        display: 'flex',
        flexDirection: 'row',
      }}
    >
      {showSplash && <DemoSplash onDismiss={dismissSplash} />}
      <CookieConsent />
      <KeybindHelp />
      <Sidebar />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: '100vh',
        }}
      >
        <TopBar />
        <main style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {/* ErrorBoundary scoped to the screen tree — a crash in
              one screen doesn't take Sidebar/TopBar/StatusBar down
              with it. Reset re-mounts the screen on user click. */}
          <ErrorBoundary source="ScreenRouter">
            <Suspense fallback={<ScreenLoading />}>
              <ScreenRouter />
            </Suspense>
          </ErrorBoundary>
        </main>
        <StatusBar />
      </div>
    </div>
  )
}

export default App
