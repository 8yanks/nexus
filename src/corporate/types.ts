import type { DataStatus, DataProvenance } from '@/types'

// ─── CORPORATE EVENT CATEGORIES ─────────────────────────────

export type CorporateEventType =
  | 'EARNINGS_RELEASE'
  | 'EARNINGS_SURPRISE'
  | 'GUIDANCE_RAISE'
  | 'GUIDANCE_CUT'
  | 'MATERIAL_EVENT'       // 8-K or equivalent
  | 'MERGER_ACQUISITION'
  | 'SECONDARY_OFFERING'
  | 'BUYBACK'
  | 'INSIDER_BUYING'
  | 'INSIDER_SELLING'
  | 'DIVIDEND'
  | 'MANAGEMENT_CHANGE'
  | 'ANALYST_REVISION'
  | 'LITIGATION'
  | 'REGULATORY'

export type CorporateBias = 'bullish' | 'bearish' | 'neutral'
export type CorporatePriority = 'high' | 'medium' | 'low'

// ─── CORPORATE EVENT ────────────────────────────────────────

export interface CorporateEvent {
  id: string
  instrumentId: string
  type: CorporateEventType
  headline: string
  summary: string
  bias: CorporateBias
  priority: CorporatePriority
  confidence: number         // 0-1, how reliable is the data
  impactScore: number        // 0-1, estimated market impact
  timestamp: string
  _source: string
  _status: DataStatus
  _provenance: DataProvenance
}

// ─── EVENT TYPE CONFIG ──────────────────────────────────────

export interface CorporateEventConfig {
  label: string
  defaultBias: CorporateBias
  defaultPriority: CorporatePriority
  icon: string               // emoji fallback
}

export const CORPORATE_EVENT_CONFIGS: Record<CorporateEventType, CorporateEventConfig> = {
  EARNINGS_RELEASE:    { label: 'Earnings Release',     defaultBias: 'neutral',  defaultPriority: 'high',   icon: '📊' },
  EARNINGS_SURPRISE:   { label: 'Earnings Surprise',    defaultBias: 'bullish',  defaultPriority: 'high',   icon: '⚡' },
  GUIDANCE_RAISE:      { label: 'Guidance Raise',       defaultBias: 'bullish',  defaultPriority: 'high',   icon: '📈' },
  GUIDANCE_CUT:        { label: 'Guidance Cut',         defaultBias: 'bearish',  defaultPriority: 'high',   icon: '📉' },
  MATERIAL_EVENT:      { label: 'Material Event (8-K)', defaultBias: 'neutral',  defaultPriority: 'medium', icon: '📋' },
  MERGER_ACQUISITION:  { label: 'M&A',                  defaultBias: 'neutral',  defaultPriority: 'high',   icon: '🤝' },
  SECONDARY_OFFERING:  { label: 'Secondary Offering',   defaultBias: 'bearish',  defaultPriority: 'medium', icon: '🏦' },
  BUYBACK:             { label: 'Share Buyback',        defaultBias: 'bullish',  defaultPriority: 'medium', icon: '💰' },
  INSIDER_BUYING:      { label: 'Insider Buying',       defaultBias: 'bullish',  defaultPriority: 'medium', icon: '🟢' },
  INSIDER_SELLING:     { label: 'Insider Selling',      defaultBias: 'bearish',  defaultPriority: 'medium', icon: '🔴' },
  DIVIDEND:            { label: 'Dividend',             defaultBias: 'bullish',  defaultPriority: 'low',    icon: '💵' },
  MANAGEMENT_CHANGE:   { label: 'Management Change',    defaultBias: 'neutral',  defaultPriority: 'medium', icon: '👤' },
  ANALYST_REVISION:    { label: 'Analyst Revision',     defaultBias: 'neutral',  defaultPriority: 'medium', icon: '📝' },
  LITIGATION:          { label: 'Litigation',           defaultBias: 'bearish',  defaultPriority: 'medium', icon: '⚖️' },
  REGULATORY:          { label: 'Regulatory Pressure',  defaultBias: 'bearish',  defaultPriority: 'medium', icon: '🏛️' },
}

// ─── CORPORATE PROVIDER INTERFACE ───────────────────────────
// Adapters for Polygon, Finnhub, EODHD etc. will implement this.

export interface CorporateDataProvider {
  id: string
  name: string
  status: 'active' | 'mock' | 'error' | 'disconnected'

  getEvents(instrumentId: string): Promise<CorporateEvent[]>
  getAllEvents(): Promise<CorporateEvent[]>
  healthCheck(): Promise<{ ok: boolean; error?: string }>
}
