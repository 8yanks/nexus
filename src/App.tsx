import { useState, useCallback, lazy, Suspense } from 'react'
import { useMarketStore } from '@/store/market'
import { useMarketData } from '@/hooks/useMarketData'
import { Nav } from '@/ui/components/Nav'
import { DemoSplash } from '@/ui/components/DemoSplash'
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

  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.bg,
        color: colors.text,
        fontFamily: fonts.sans,
      }}
    >
      {showSplash && <DemoSplash onDismiss={dismissSplash} />}
      <Nav />
      <Suspense fallback={<ScreenLoading />}>
        <ScreenRouter />
      </Suspense>
    </div>
  )
}

export default App
