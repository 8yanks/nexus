// ─── SYMBOL MAPPING: Internal IDs ↔ Exchange symbols ────────
// Our instrument IDs are exchange-agnostic. Each exchange has its
// own symbol conventions. This module bridges the two.

export interface SymbolMapping {
  instrumentId: string
  binanceSymbol: string
  type: 'spot' | 'futures'
}

export const BINANCE_MAPPINGS: SymbolMapping[] = [
  { instrumentId: 'BTC-USD-SPOT', binanceSymbol: 'BTCUSDT', type: 'spot' },
  { instrumentId: 'ETH-USD-SPOT', binanceSymbol: 'ETHUSDT', type: 'spot' },
  { instrumentId: 'SOL-USD-SPOT', binanceSymbol: 'SOLUSDT', type: 'spot' },
  { instrumentId: 'BTC-PERP',     binanceSymbol: 'BTCUSDT', type: 'futures' },
  { instrumentId: 'ETH-PERP',     binanceSymbol: 'ETHUSDT', type: 'futures' },
]

const _byInstrumentId = new Map(BINANCE_MAPPINGS.map((m) => [m.instrumentId, m]))
const _byBinanceSpot = new Map(
  BINANCE_MAPPINGS.filter((m) => m.type === 'spot').map((m) => [m.binanceSymbol.toLowerCase(), m]),
)
const _byBinanceFutures = new Map(
  BINANCE_MAPPINGS.filter((m) => m.type === 'futures').map((m) => [m.binanceSymbol.toLowerCase(), m]),
)

export const toBinanceSymbol = (instrumentId: string): string | null =>
  _byInstrumentId.get(instrumentId)?.binanceSymbol ?? null

export const fromBinanceSpotSymbol = (symbol: string): string | null =>
  _byBinanceSpot.get(symbol.toLowerCase())?.instrumentId ?? null

export const fromBinanceFuturesSymbol = (symbol: string): string | null =>
  _byBinanceFutures.get(symbol.toLowerCase())?.instrumentId ?? null

export const isBinanceInstrument = (instrumentId: string): boolean =>
  _byInstrumentId.has(instrumentId)

export const getBinanceMapping = (instrumentId: string): SymbolMapping | null =>
  _byInstrumentId.get(instrumentId) ?? null

export const getSpotInstrumentIds = (): string[] =>
  BINANCE_MAPPINGS.filter((m) => m.type === 'spot').map((m) => m.instrumentId)

export const getFuturesInstrumentIds = (): string[] =>
  BINANCE_MAPPINGS.filter((m) => m.type === 'futures').map((m) => m.instrumentId)

// ─── COINBASE EXCHANGE MAPPINGS ─────────────────────────────
// Coinbase uses dash-separated product IDs (e.g. BTC-USD, ETH-USD).
// We map the same internal spot IDs that Binance covers, so Coinbase
// can serve as a fallback when Binance fails — same instruments,
// different exchange, cross-validated prices.

export interface CoinbaseSymbolMapping {
  instrumentId: string
  coinbaseProductId: string
}

export const COINBASE_MAPPINGS: CoinbaseSymbolMapping[] = [
  { instrumentId: 'BTC-USD-SPOT', coinbaseProductId: 'BTC-USD' },
  { instrumentId: 'ETH-USD-SPOT', coinbaseProductId: 'ETH-USD' },
  { instrumentId: 'SOL-USD-SPOT', coinbaseProductId: 'SOL-USD' },
]

const _byCoinbaseInstrumentId = new Map(COINBASE_MAPPINGS.map((m) => [m.instrumentId, m]))
const _byCoinbaseProductId = new Map(COINBASE_MAPPINGS.map((m) => [m.coinbaseProductId, m]))

export const toCoinbaseProductId = (instrumentId: string): string | null =>
  _byCoinbaseInstrumentId.get(instrumentId)?.coinbaseProductId ?? null

export const fromCoinbaseProductId = (productId: string): string | null =>
  _byCoinbaseProductId.get(productId)?.instrumentId ?? null

export const isCoinbaseInstrument = (instrumentId: string): boolean =>
  _byCoinbaseInstrumentId.has(instrumentId)

export const getCoinbaseInstrumentIds = (): string[] =>
  COINBASE_MAPPINGS.map((m) => m.instrumentId)

// ─── KRAKEN MAPPINGS ────────────────────────────────────────
// Kraken uses XBT for BTC (legacy). Other pairs round-trip as-is.
// Kept to the same 3 spot pairs as Binance / Coinbase so the
// fallback chain runs on identical instruments across all three.

export interface KrakenSymbolMapping {
  instrumentId: string
  krakenPair: string
}

export const KRAKEN_MAPPINGS: KrakenSymbolMapping[] = [
  { instrumentId: 'BTC-USD-SPOT', krakenPair: 'XBTUSD' },
  { instrumentId: 'ETH-USD-SPOT', krakenPair: 'ETHUSD' },
  { instrumentId: 'SOL-USD-SPOT', krakenPair: 'SOLUSD' },
]

const _byKrakenInstrumentId = new Map(KRAKEN_MAPPINGS.map((m) => [m.instrumentId, m]))

export const toKrakenPair = (instrumentId: string): string | null =>
  _byKrakenInstrumentId.get(instrumentId)?.krakenPair ?? null

export const isKrakenInstrument = (instrumentId: string): boolean =>
  _byKrakenInstrumentId.has(instrumentId)

export const getKrakenInstrumentIds = (): string[] =>
  KRAKEN_MAPPINGS.map((m) => m.instrumentId)
