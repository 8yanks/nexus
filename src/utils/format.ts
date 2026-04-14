import type { AssetClass } from '@/types'

// ─── NUMBER FORMATTING ───────────────────────────────────────

export const fmt = (n: number | null | undefined, decimals = 2): string => {
  if (n == null) return '—'
  return Number(n).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export const fmtPct = (n: number | null | undefined): string => {
  if (n == null) return '—'
  return `${n >= 0 ? '+' : ''}${(n * 100).toFixed(2)}%`
}

export const fmtVol = (n: number | null | undefined): string => {
  if (n == null) return '—'
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toFixed(0)
}

// ─── TIME FORMATTING ─────────────────────────────────────────

export const fmtTime = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export const fmtAge = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return `${Math.floor(s)}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

// ─── ASSET CLASS DISPLAY ─────────────────────────────────────

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  crypto_spot: 'Crypto Spot',
  crypto_perp: 'Crypto Perp',
  us_equity: 'US Equity',
  forex: 'Forex',
  index: 'Index',
  commodity: 'Commodity',
}

export const ASSET_CLASS_COLORS: Record<AssetClass, string> = {
  crypto_spot: '#ffaa22',
  crypto_perp: '#ff6644',
  us_equity: '#3b82f6',
  forex: '#06b6d4',
  index: '#a855f7',
  commodity: '#00d4aa',
}
