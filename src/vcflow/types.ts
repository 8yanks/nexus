import type { DataStatus, DataProvenance } from '@/types'

// ─── VC DEAL TYPES ──────────────────────────────────────────

export type VCDealType =
  | 'SEED'
  | 'SERIES_A'
  | 'SERIES_B'
  | 'SERIES_C'
  | 'SERIES_D_PLUS'
  | 'GROWTH'
  | 'IPO_PREP'
  | 'ACQUISITION'
  | 'NEW_FUND'
  | 'SPAC'

export type VCSector =
  | 'AI_ML'
  | 'INFRASTRUCTURE'
  | 'CYBERSECURITY'
  | 'FINTECH'
  | 'BIOTECH'
  | 'CLIMATE'
  | 'DEVTOOLS'
  | 'ROBOTICS'
  | 'SPACE'
  | 'ENTERPRISE'
  | 'CONSUMER'
  | 'CRYPTO_WEB3'
  | 'HEALTHCARE'
  | 'DEFENSE'

export type VCGeo = 'US' | 'EU' | 'UK' | 'ASIA' | 'LATAM' | 'OTHER'

// ─── VC DEAL EVENT ──────────────────────────────────────────

export interface VCDeal {
  id: string
  companyName: string
  dealType: VCDealType
  amount: number | null          // in USD
  valuation: number | null       // post-money, if available
  sector: VCSector
  geo: VCGeo
  investors: string[]            // lead investors
  headline: string
  summary: string
  /** Related public tickers that may be influenced */
  relatedTickers: string[]
  timestamp: string
  _source: string
  _status: DataStatus
  _provenance: DataProvenance
}

// ─── SECTOR THEME CONFIG ────────────────────────────────────

export interface VCSectorConfig {
  label: string
  color: string
}

export const VC_SECTOR_CONFIGS: Record<VCSector, VCSectorConfig> = {
  AI_ML:         { label: 'AI / ML',          color: '#a855f7' },
  INFRASTRUCTURE:{ label: 'Infrastructure',   color: '#3b82f6' },
  CYBERSECURITY: { label: 'Cybersecurity',    color: '#ef4444' },
  FINTECH:       { label: 'Fintech',          color: '#06b6d4' },
  BIOTECH:       { label: 'Biotech',          color: '#22c55e' },
  CLIMATE:       { label: 'Climate',          color: '#10b981' },
  DEVTOOLS:      { label: 'Dev Tools',        color: '#f59e0b' },
  ROBOTICS:      { label: 'Robotics',         color: '#ec4899' },
  SPACE:         { label: 'Space',            color: '#6366f1' },
  ENTERPRISE:    { label: 'Enterprise',       color: '#64748b' },
  CONSUMER:      { label: 'Consumer',         color: '#f97316' },
  CRYPTO_WEB3:   { label: 'Crypto / Web3',    color: '#eab308' },
  HEALTHCARE:    { label: 'Healthcare',       color: '#14b8a6' },
  DEFENSE:       { label: 'Defense',          color: '#78716c' },
}

export const VC_DEAL_LABELS: Record<VCDealType, string> = {
  SEED: 'Seed',
  SERIES_A: 'Series A',
  SERIES_B: 'Series B',
  SERIES_C: 'Series C',
  SERIES_D_PLUS: 'Series D+',
  GROWTH: 'Growth',
  IPO_PREP: 'IPO Prep',
  ACQUISITION: 'Acquisition',
  NEW_FUND: 'New Fund',
  SPAC: 'SPAC',
}

// ─── VC DATA PROVIDER ───────────────────────────────────────

export interface VCDataProvider {
  id: string
  name: string
  status: 'active' | 'mock' | 'error' | 'disconnected'

  getDeals(sector?: VCSector): Promise<VCDeal[]>
  getAllDeals(): Promise<VCDeal[]>
  healthCheck(): Promise<{ ok: boolean; error?: string }>
}
