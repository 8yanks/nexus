export type AssetClass =
  | 'crypto_spot'
  | 'crypto_perp'
  | 'us_equity'
  | 'forex'
  | 'index'
  | 'commodity'

export interface InstrumentMetadata {
  listingDate: string
  sector: string | null
}

export interface Instrument {
  id: string
  symbol: string
  name: string
  assetClass: AssetClass
  exchange: string
  baseCurrency: string
  quoteCurrency: string
  contractType: 'perpetual' | 'spot' | null
  tickSize: number
  lotSize: number
  metadata: InstrumentMetadata
}
