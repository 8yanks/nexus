import type { DataStatus, DataProvenance } from './quality'

export interface FundingSnapshot {
  instrumentId: string
  fundingRate: number
  nextFundingTime: string
  predictedRate: number | null
  _source: string
  _status: DataStatus
  _provenance: DataProvenance
}
