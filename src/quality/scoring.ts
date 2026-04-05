import type { Instrument, MarketSnapshot, DataQualityReport } from '@/types'

// ─── ASSESS QUALITY ──────────────────────────────────────────
// Exact port of assessQuality() from the prototype.
// freshness is derived from _provenance.latencyMs (replaces _meta.latencyMs).
// isSimulated is derived from _status === 'SIMULATED'.

export const assessQuality = (
  inst: Instrument,
  snap: MarketSnapshot,
): DataQualityReport => {
  const hasPrice  = snap.price != null
  const hasBidAsk = snap.bid != null && snap.ask != null
  const hasVolume = snap.volume24h != null
  const hasOI     = inst.assetClass.startsWith('crypto') ? snap.openInterest != null : true
  const hasFunding = inst.assetClass === 'crypto_perp' ? snap.fundingRate != null : true

  const fields = [hasPrice, hasBidAsk, hasVolume, hasOI, hasFunding]
  const completeness = fields.filter(Boolean).length / fields.length

  const latencyMs = snap._provenance.latencyMs
  const freshnessRaw =
    latencyMs != null
      ? latencyMs < 500  ? 1
      : latencyMs < 2000 ? 0.7
      :                    0.3
      : 0

  const isSimulated = snap._status === 'SIMULATED'
  const freshness  = isSimulated ? 0 : freshnessRaw
  const reliability = isSimulated ? 0 : 0.95
  const overallScore = isSimulated
    ? completeness * 0.3
    : completeness * 0.4 + freshness * 0.3 + reliability * 0.3

  const issues: string[] = [
    ...(isSimulated            ? ['All data is SIMULATED — not from live market feed'] : []),
    ...(!hasPrice              ? ['Price data missing']          : []),
    ...(!hasBidAsk             ? ['Bid/Ask data missing']        : []),
    ...(!hasVolume             ? ['Volume data missing']         : []),
    ...(inst.assetClass.startsWith('crypto') && !hasOI
                               ? ['Open interest missing']       : []),
    ...(inst.assetClass === 'crypto_perp' && !hasFunding
                               ? ['Funding rate missing']        : []),
  ]

  return {
    instrumentId: inst.id,
    completeness,
    freshness,
    reliability,
    overallScore,
    issues,
    _source: 'quality_engine',
    _status: snap._status,
    assessedAt: new Date().toISOString(),
  }
}

// ─── BATCH ASSESS ────────────────────────────────────────────

export const assessAllQuality = (
  instruments: Instrument[],
  snapshots: Record<string, MarketSnapshot>,
): Record<string, DataQualityReport> => {
  const result: Record<string, DataQualityReport> = {}
  for (const inst of instruments) {
    const snap = snapshots[inst.id]
    if (snap) result[inst.id] = assessQuality(inst, snap)
  }
  return result
}
