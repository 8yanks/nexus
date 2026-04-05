export type DataStatus =
  | 'LIVE'
  | 'DELAYED'
  | 'SIMULATED'
  | 'STALE'
  | 'UNAVAILABLE'
  | 'ERROR'

export interface DataProvenance {
  source: string
  fetchMethod: 'ws' | 'rest' | 'mock' | 'computed' | 'generated' | 'replay'
  latencyMs: number | null
  timestamp: string
  receivedAt: string
}

export interface DataQualityMetrics {
  completeness: number   // 0–1
  timeliness: number     // 0–1
  accuracy: number       // 0–1
  consistency: number    // 0–1
}

export interface DataQualityReport {
  instrumentId: string
  completeness: number
  freshness: number
  reliability: number
  overallScore: number
  issues: string[]
  _source: string
  _status: DataStatus
  assessedAt: string
}
