import type { MacroIndicator, MacroCalendarEvent, MacroDataProvider, MacroCategory, MacroRegion, MacroTrend, MacroImpact } from './types'

// ─── MOCK MACRO INDICATORS ─────────────────────────────────

let _macroId = 0
const mkId = (): string => `macro_${++_macroId}`

const mkIndicator = (
  name: string,
  shortName: string,
  category: MacroCategory,
  region: MacroRegion,
  value: number,
  previous: number,
  unit: string,
  frequency: string,
  impact: MacroImpact,
  description: string,
  hoursAgo = 0,
  nextReleaseDays: number | null = null,
): MacroIndicator => {
  const change = value - previous
  const changePct = previous !== 0 ? change / previous : 0
  const trend: MacroTrend = Math.abs(changePct) < 0.005 ? 'flat' : change > 0 ? 'rising' : 'falling'

  return {
    id: mkId(),
    name,
    shortName,
    category,
    region,
    value,
    previousValue: previous,
    change,
    changePct,
    trend,
    unit,
    frequency,
    lastUpdate: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
    nextRelease: nextReleaseDays != null
      ? new Date(Date.now() + nextReleaseDays * 86400000).toISOString()
      : null,
    impact,
    description,
    _source: 'mock_macro',
    _status: 'SIMULATED',
    _provenance: { source: 'mock_macro', fetchMethod: 'generated', latencyMs: 0 },
  }
}

const MOCK_INDICATORS: MacroIndicator[] = [
  // RATES
  mkIndicator('Fed Funds Rate', 'FFR', 'RATES', 'US', 4.50, 4.75, '%', 'meeting', 'high',
    'Federal Reserve target rate. Key driver of USD strength and risk appetite.', 48, 42),
  mkIndicator('US 10Y Treasury Yield', 'US10Y', 'RATES', 'US', 4.28, 4.35, '%', 'daily', 'high',
    'Benchmark long-term rate. Inverse relationship with bond prices.', 1),
  mkIndicator('US 2Y Treasury Yield', 'US2Y', 'RATES', 'US', 4.05, 4.12, '%', 'daily', 'medium',
    'Short-term rate. Spread with 10Y signals recession risk.', 1),
  mkIndicator('ECB Main Refinancing Rate', 'ECB', 'RATES', 'EU', 3.65, 3.90, '%', 'meeting', 'high',
    'European Central Bank main policy rate.', 168, 35),

  // INFLATION
  mkIndicator('US CPI YoY', 'CPI', 'INFLATION', 'US', 2.8, 3.1, '%', 'monthly', 'high',
    'Consumer Price Index year-over-year. Primary inflation gauge.', 240, 28),
  mkIndicator('US Core PCE YoY', 'PCE', 'INFLATION', 'US', 2.6, 2.7, '%', 'monthly', 'high',
    'Fed\'s preferred inflation measure. Excludes food and energy.', 360, 21),
  mkIndicator('EU HICP YoY', 'HICP', 'INFLATION', 'EU', 2.2, 2.4, '%', 'monthly', 'medium',
    'Harmonized Index of Consumer Prices for the Eurozone.', 336, 25),

  // EMPLOYMENT
  mkIndicator('US Non-Farm Payrolls', 'NFP', 'EMPLOYMENT', 'US', 225, 256, 'K', 'monthly', 'high',
    'Monthly job additions. Most watched US employment indicator.', 120, 30),
  mkIndicator('US Unemployment Rate', 'UNEMP', 'EMPLOYMENT', 'US', 4.1, 4.0, '%', 'monthly', 'high',
    'Headline unemployment rate.', 120, 30),
  mkIndicator('US Initial Jobless Claims', 'CLAIMS', 'EMPLOYMENT', 'US', 218, 225, 'K', 'weekly', 'medium',
    'Weekly initial unemployment insurance claims.', 24, 7),

  // GROWTH
  mkIndicator('US GDP QoQ Annualized', 'GDP', 'GROWTH', 'US', 2.4, 3.1, '%', 'quarterly', 'high',
    'Real GDP growth rate, annualized.', 720, 60),
  mkIndicator('US ISM Manufacturing PMI', 'PMI', 'GROWTH', 'US', 50.3, 49.2, 'index', 'monthly', 'high',
    'Purchasing Managers Index. Above 50 = expansion.', 48, 28),
  mkIndicator('US ISM Services PMI', 'SPMI', 'GROWTH', 'US', 52.7, 53.4, 'index', 'monthly', 'medium',
    'Services sector PMI. Above 50 = expansion.', 72, 26),

  // SENTIMENT
  mkIndicator('CBOE VIX', 'VIX', 'SENTIMENT', 'US', 16.5, 18.2, 'index', 'daily', 'high',
    'Fear index. Implied volatility of S&P 500 options.', 1),
  mkIndicator('US Consumer Confidence', 'CONCONF', 'SENTIMENT', 'US', 104.2, 102.8, 'index', 'monthly', 'medium',
    'Conference Board Consumer Confidence Index.', 168, 24),
  mkIndicator('US Michigan Sentiment', 'UMICH', 'SENTIMENT', 'US', 67.8, 64.7, 'index', 'monthly', 'medium',
    'University of Michigan Consumer Sentiment.', 336, 18),

  // COMMODITIES
  mkIndicator('WTI Crude Oil', 'WTI', 'COMMODITIES', 'GLOBAL', 78.45, 75.20, '$', 'daily', 'high',
    'West Texas Intermediate crude oil spot price.', 1),
  mkIndicator('Gold Spot', 'GOLD', 'COMMODITIES', 'GLOBAL', 2345.80, 2298.50, '$', 'daily', 'medium',
    'Gold spot price USD per troy ounce.', 1),
  mkIndicator('Copper', 'COPPER', 'COMMODITIES', 'GLOBAL', 4.52, 4.38, '$', 'daily', 'medium',
    'Copper futures. Industrial demand proxy.', 2),

  // FX INDEX
  mkIndicator('US Dollar Index', 'DXY', 'FX_INDEX', 'US', 104.2, 105.1, 'index', 'daily', 'high',
    'Dollar strength vs basket of 6 major currencies.', 1),

  // HOUSING
  mkIndicator('US Housing Starts', 'HSTARTS', 'HOUSING', 'US', 1.42, 1.38, 'M', 'monthly', 'medium',
    'New residential construction starts, seasonally adjusted annual rate.', 336, 22),
]

// ─── MOCK CALENDAR ──────────────────────────────────────────

let _calId = 0

const mkCal = (
  indicatorId: string,
  name: string,
  region: MacroRegion,
  impact: MacroImpact,
  daysFromNow: number,
  forecast: number | null,
  previous: number | null,
  actual: number | null = null,
): MacroCalendarEvent => ({
  id: `cal_${++_calId}`,
  indicatorId,
  name,
  region,
  scheduledAt: new Date(Date.now() + daysFromNow * 86400000).toISOString(),
  impact,
  forecast,
  previous,
  actual,
  surprise: actual != null && forecast != null ? actual - forecast : null,
  _source: 'mock_macro',
  _status: 'SIMULATED',
})

const MOCK_CALENDAR: MacroCalendarEvent[] = [
  mkCal('macro_1', 'FOMC Rate Decision', 'US', 'high', 42, 4.50, 4.50),
  mkCal('macro_5', 'US CPI YoY', 'US', 'high', 28, 2.7, 2.8),
  mkCal('macro_6', 'US Core PCE YoY', 'US', 'high', 21, 2.5, 2.6),
  mkCal('macro_8', 'US Non-Farm Payrolls', 'US', 'high', 30, 200, 225),
  mkCal('macro_12', 'US ISM Manufacturing PMI', 'US', 'high', 28, 50.5, 50.3),
  mkCal('macro_10', 'US Initial Claims', 'US', 'medium', 7, 220, 218),
  mkCal('macro_11', 'US GDP QoQ (Prelim)', 'US', 'high', 60, 2.2, 2.4),
  mkCal('macro_4', 'ECB Rate Decision', 'EU', 'high', 35, 3.40, 3.65),
  mkCal('macro_22', 'US Housing Starts', 'US', 'medium', 22, 1.40, 1.42),
  // Past events (already released)
  mkCal('macro_5', 'US CPI YoY (Mar)', 'US', 'high', -2, 3.0, 3.1, 2.8),
  mkCal('macro_8', 'US NFP (Mar)', 'US', 'high', -5, 240, 256, 225),
]

// ─── MOCK PROVIDER ──────────────────────────────────────────

export const createMockMacroProvider = (): MacroDataProvider => ({
  id: 'mock_macro',
  name: 'Mock Macro Intelligence',
  status: 'mock',

  getIndicators: async (category) => {
    if (!category) return [...MOCK_INDICATORS]
    return MOCK_INDICATORS.filter((i) => i.category === category)
  },

  getCalendar: async (days = 60) => {
    const cutoff = Date.now() - 7 * 86400000 // include recent past events
    const future = Date.now() + days * 86400000
    return MOCK_CALENDAR
      .filter((e) => {
        const t = new Date(e.scheduledAt).getTime()
        return t >= cutoff && t <= future
      })
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
  },

  healthCheck: async () => ({ ok: true }),
})
