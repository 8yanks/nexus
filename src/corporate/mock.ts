import type { CorporateEvent, CorporateDataProvider, CorporateEventType, CorporateBias, CorporatePriority } from './types'
import { CORPORATE_EVENT_CONFIGS } from './types'

// ─── MOCK CORPORATE DATA ────────────────────────────────────
// Realistic but clearly mock data. All events carry SIMULATED status.
// These events are based on plausible corporate scenarios for the
// US equity instruments covered (AAPL, MSFT, TSLA, NVDA).

let _eventId = 0
const mkId = (): string => `corp_${++_eventId}`

const mkEvent = (
  instrumentId: string,
  type: CorporateEventType,
  headline: string,
  summary: string,
  bias?: CorporateBias,
  priority?: CorporatePriority,
  hoursAgo = 0,
  impact = 0.5,
): CorporateEvent => {
  const cfg = CORPORATE_EVENT_CONFIGS[type]
  return {
    id: mkId(),
    instrumentId,
    type,
    headline,
    summary,
    bias: bias ?? cfg.defaultBias,
    priority: priority ?? cfg.defaultPriority,
    confidence: 0.7,
    impactScore: impact,
    timestamp: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
    _source: 'mock_corporate',
    _status: 'SIMULATED',
    _provenance: { source: 'mock_corporate', fetchMethod: 'generated', latencyMs: 0, timestamp: new Date().toISOString(), receivedAt: new Date().toISOString() },
  }
}

const MOCK_EVENTS: CorporateEvent[] = [
  // AAPL
  mkEvent('aapl', 'EARNINGS_RELEASE', 'AAPL Q1 2026 Earnings Release',
    'Apple reports Q1 revenue of $124.3B, beating estimates of $119.8B. Services revenue at all-time high.',
    'bullish', 'high', 2, 0.85),
  mkEvent('aapl', 'EARNINGS_SURPRISE', 'AAPL EPS Beat: +8.2%',
    'EPS of $2.42 vs expected $2.24. Driven by strong iPhone and Services growth.',
    'bullish', 'high', 2, 0.8),
  mkEvent('aapl', 'BUYBACK', 'AAPL Announces $100B Buyback Program',
    'Apple authorizes additional $100 billion in share repurchases, signaling confidence in future earnings.',
    'bullish', 'medium', 6, 0.6),
  mkEvent('aapl', 'ANALYST_REVISION', 'Goldman Sachs Raises AAPL Target to $245',
    'Goldman raises price target from $220 to $245 citing strong services momentum.',
    'bullish', 'medium', 12, 0.4),

  // MSFT
  mkEvent('msft', 'GUIDANCE_RAISE', 'MSFT Raises FY26 Revenue Guidance',
    'Microsoft raises full-year guidance to $255-260B from $248-252B on Azure/AI strength.',
    'bullish', 'high', 4, 0.75),
  mkEvent('msft', 'MERGER_ACQUISITION', 'MSFT Completes Acquisition of AI Startup for $2.1B',
    'Microsoft acquires AI infrastructure startup to accelerate Copilot capabilities.',
    'neutral', 'medium', 24, 0.45),
  mkEvent('msft', 'INSIDER_BUYING', 'MSFT CFO Buys 5,000 Shares',
    'CFO Amy Hood purchased 5,000 shares at market price, first insider buy in 6 months.',
    'bullish', 'medium', 48, 0.35),

  // TSLA
  mkEvent('tsla', 'EARNINGS_RELEASE', 'TSLA Q1 2026 Earnings Release',
    'Tesla reports Q1 deliveries of 495K units, revenue of $28.1B. Margins under pressure.',
    'neutral', 'high', 8, 0.7),
  mkEvent('tsla', 'GUIDANCE_CUT', 'TSLA Lowers FY26 Delivery Target',
    'Tesla cuts full-year delivery guidance to 2.1M from 2.3M citing supply chain challenges.',
    'bearish', 'high', 8, 0.8),
  mkEvent('tsla', 'INSIDER_SELLING', 'TSLA Director Sells $15M in Stock',
    'Board member Kimbal Musk sells 50,000 shares over 3 days through pre-planned 10b5-1.',
    'bearish', 'medium', 36, 0.3),
  mkEvent('tsla', 'LITIGATION', 'TSLA Faces Class Action Over Autopilot Claims',
    'New class action lawsuit filed in California federal court alleging misleading Autopilot marketing.',
    'bearish', 'medium', 72, 0.45),

  // NVDA
  mkEvent('nvda', 'EARNINGS_SURPRISE', 'NVDA Revenue Beats by 12%',
    'NVIDIA Q4 revenue of $38.2B crushes Street estimate of $34.1B. Data center up 85% YoY.',
    'bullish', 'high', 3, 0.9),
  mkEvent('nvda', 'GUIDANCE_RAISE', 'NVDA Guides Q1 Revenue Above Consensus',
    'NVIDIA guides Q1 to $42-44B vs consensus of $38B, citing insatiable AI infrastructure demand.',
    'bullish', 'high', 3, 0.85),
  mkEvent('nvda', 'ANALYST_REVISION', 'Multiple Analysts Raise NVDA Targets',
    'Average price target raised to $180 from $155. 45 of 50 analysts rate Buy or Strong Buy.',
    'bullish', 'medium', 16, 0.5),
  mkEvent('nvda', 'REGULATORY', 'NVDA Export Restrictions Tightened',
    'US Commerce Dept. announces new restrictions on AI chip exports to Middle East markets.',
    'bearish', 'medium', 120, 0.55),
]

// ─── MOCK PROVIDER ──────────────────────────────────────────

export const createMockCorporateProvider = (): CorporateDataProvider => ({
  id: 'mock_corporate',
  name: 'Mock Corporate Intelligence',
  status: 'mock',

  getEvents: async (instrumentId: string): Promise<CorporateEvent[]> => {
    return MOCK_EVENTS.filter((e) => e.instrumentId === instrumentId)
  },

  getAllEvents: async (): Promise<CorporateEvent[]> => {
    return [...MOCK_EVENTS].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
  },

  healthCheck: async () => ({ ok: true }),
})
