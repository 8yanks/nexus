import type { SignalEvent, SignalType, SignalDirection, DataStatus } from '@/types'
import type { CorporateEvent, CorporateEventType } from '@/corporate/types'
import type { MacroIndicator } from '@/macro/types'

// ─── CORPORATE → SIGNAL ────────────────────────────────────

let _seqId = 0
const genId = (): string => `sig_bridge_${Date.now()}_${++_seqId}`

const CORP_TYPE_MAP: Record<CorporateEventType, SignalType> = {
  EARNINGS_RELEASE:   'CORP_EARNINGS_SURPRISE',
  EARNINGS_SURPRISE:  'CORP_EARNINGS_SURPRISE',
  GUIDANCE_RAISE:     'CORP_GUIDANCE_CHANGE',
  GUIDANCE_CUT:       'CORP_GUIDANCE_CHANGE',
  MATERIAL_EVENT:     'CORP_MA_EVENT',
  MERGER_ACQUISITION: 'CORP_MA_EVENT',
  SECONDARY_OFFERING: 'CORP_MA_EVENT',
  BUYBACK:            'CORP_MA_EVENT',
  INSIDER_BUYING:     'CORP_INSIDER_ACTIVITY',
  INSIDER_SELLING:    'CORP_INSIDER_ACTIVITY',
  DIVIDEND:           'CORP_GUIDANCE_CHANGE',
  MANAGEMENT_CHANGE:  'CORP_REGULATORY',
  ANALYST_REVISION:   'CORP_GUIDANCE_CHANGE',
  LITIGATION:         'CORP_REGULATORY',
  REGULATORY:         'CORP_REGULATORY',
}

const biasToDirection = (bias: string): SignalDirection => {
  if (bias === 'bullish') return 'bullish'
  if (bias === 'bearish') return 'bearish'
  return 'neutral'
}

export const corporateToSignals = (events: CorporateEvent[]): SignalEvent[] =>
  events
    .filter((e) => e.priority !== 'low')
    .map((e) => ({
      id: genId(),
      instrumentId: e.instrumentId,
      type: CORP_TYPE_MAP[e.type],
      direction: biasToDirection(e.bias),
      strength: e.impactScore,
      description: `[Corporate] ${e.headline}`,
      price: 0,
      timestamp: e.timestamp,
      _source: `corporate_bridge:${e._source}`,
      _status: e._status,
    }))

// ─── MACRO → SIGNAL ────────────────────────────────────────

const MACRO_CAT_MAP: Record<string, SignalType> = {
  RATES:       'MACRO_RATE_CHANGE',
  INFLATION:   'MACRO_INFLATION_SHIFT',
  EMPLOYMENT:  'MACRO_SENTIMENT_SHIFT',
  GROWTH:      'MACRO_SENTIMENT_SHIFT',
  SENTIMENT:   'MACRO_SENTIMENT_SHIFT',
  COMMODITIES: 'MACRO_SENTIMENT_SHIFT',
  FX_INDEX:    'MACRO_SENTIMENT_SHIFT',
  HOUSING:     'MACRO_SENTIMENT_SHIFT',
}

export const macroToSignals = (indicators: MacroIndicator[]): SignalEvent[] =>
  indicators
    .filter((i) => i.impact !== 'low' && Math.abs(i.changePct) > 0.5)
    .map((i) => {
      const direction: SignalDirection =
        i.trend === 'rising' ? 'bullish' : i.trend === 'falling' ? 'bearish' : 'neutral'
      const strength = Math.min(1, Math.abs(i.changePct) / 10 + 0.5)

      return {
        id: genId(),
        instrumentId: 'MACRO',
        type: MACRO_CAT_MAP[i.category] ?? ('MACRO_SENTIMENT_SHIFT' as SignalType),
        direction,
        strength,
        description: `[Macro] ${i.name}: ${i.value}${i.unit} (${i.trend})`,
        price: i.value,
        timestamp: i.lastUpdate,
        _source: `macro_bridge:${i._source}`,
        _status: i._status as DataStatus,
      }
    })
