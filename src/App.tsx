import { useMarketStore } from '@/store/market'
import { useMarketData } from '@/hooks/useMarketData'
import { Nav } from '@/ui/components/Nav'
import { Dashboard } from '@/ui/screens/Dashboard'
import { Detail } from '@/ui/screens/Detail'
import { Scanner } from '@/ui/screens/Scanner'
import { Alerts } from '@/ui/screens/Alerts'
import { Quality } from '@/ui/screens/Quality'
import { Sources } from '@/ui/screens/Sources'
import { Export } from '@/ui/screens/Export'
import { Journal } from '@/ui/screens/Journal'
import { Correlation } from '@/ui/screens/Correlation'
import { Backtest } from '@/ui/screens/Backtest'
import { Corporate } from '@/ui/screens/Corporate'
import { VCFlow } from '@/ui/screens/VCFlow'
import { MacroPulse } from '@/ui/screens/MacroPulse'
import { colors, fonts } from '@/ui/theme'

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
  }
}

function App() {
  // Start auto-refresh on mount
  useMarketData()

  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.bg,
        color: colors.text,
        fontFamily: fonts.sans,
      }}
    >
      <Nav />
      <ScreenRouter />
    </div>
  )
}

export default App
