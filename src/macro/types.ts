import type { DataStatus, DataProvenance } from '@/types'

// ─── MACRO INDICATOR CATEGORIES ─────────────────────────────

export type MacroCategory =
  | 'RATES'           // Central bank rates, yields
  | 'INFLATION'       // CPI, PPI, PCE
  | 'EMPLOYMENT'      // NFP, unemployment, claims
  | 'GROWTH'          // GDP, PMI, industrial production
  | 'SENTIMENT'       // Consumer confidence, VIX
  | 'COMMODITIES'     // Oil, gold, metals spot
  | 'FX_INDEX'        // DXY, trade-weighted
  | 'HOUSING'         // Housing starts, permits, S&P Case-Shiller

export type MacroRegion = 'US' | 'EU' | 'UK' | 'JP' | 'CN' | 'GLOBAL'
export type MacroTrend = 'rising' | 'falling' | 'flat'
export type MacroImpact = 'high' | 'medium' | 'low'

// ─── MACRO INDICATOR ────────────────────────────────────────

export interface MacroIndicator {
  id: string
  name: string
  shortName: string
  category: MacroCategory
  region: MacroRegion
  value: number
  previousValue: number
  change: number                 // value - previousValue
  changePct: number              // change / previousValue
  trend: MacroTrend
  unit: string                   // '%', 'K', '$', 'index', 'bps'
  frequency: string              // 'monthly', 'weekly', 'daily', 'quarterly'
  lastUpdate: string             // ISO timestamp
  nextRelease: string | null     // ISO timestamp of next scheduled release
  impact: MacroImpact
  description: string
  _source: string
  _status: DataStatus
  _provenance: DataProvenance
}

// ─── MACRO CALENDAR EVENT ───────────────────────────────────

export interface MacroCalendarEvent {
  id: string
  indicatorId: string
  name: string
  region: MacroRegion
  scheduledAt: string
  impact: MacroImpact
  forecast: number | null
  previous: number | null
  actual: number | null          // null if not yet released
  surprise: number | null        // actual - forecast
  _source: string
  _status: DataStatus
}

// ─── CATEGORY CONFIG ────────────────────────────────────────

export interface MacroCategoryConfig {
  label: string
  color: string
}

export const MACRO_CATEGORY_CONFIGS: Record<MacroCategory, MacroCategoryConfig> = {
  RATES:       { label: 'Interest Rates',    color: '#3b82f6' },
  INFLATION:   { label: 'Inflation',         color: '#ef4444' },
  EMPLOYMENT:  { label: 'Employment',        color: '#22c55e' },
  GROWTH:      { label: 'GDP & Growth',      color: '#f59e0b' },
  SENTIMENT:   { label: 'Sentiment',         color: '#a855f7' },
  COMMODITIES: { label: 'Commodities',       color: '#f97316' },
  FX_INDEX:    { label: 'FX Indices',        color: '#06b6d4' },
  HOUSING:     { label: 'Housing',           color: '#ec4899' },
}

// ─── MACRO DATA PROVIDER ────────────────────────────────────

export interface MacroDataProvider {
  id: string
  name: string
  status: 'active' | 'mock' | 'error' | 'disconnected'

  getIndicators(category?: MacroCategory): Promise<MacroIndicator[]>
  getCalendar(days?: number): Promise<MacroCalendarEvent[]>
  healthCheck(): Promise<{ ok: boolean; error?: string }>
}
