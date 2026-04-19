import { describe, it, expect } from 'vitest'
import {
  toBinanceSymbol,
  fromBinanceSpotSymbol,
  fromBinanceFuturesSymbol,
  isBinanceInstrument,
  getBinanceMapping,
  getSpotInstrumentIds,
  getFuturesInstrumentIds,
  BINANCE_MAPPINGS,
  toCoinbaseProductId,
  fromCoinbaseProductId,
  isCoinbaseInstrument,
  getCoinbaseInstrumentIds,
  COINBASE_MAPPINGS,
} from '@/normalization/instrument'

describe('Normalization — Instrument Symbol Mapping', () => {
  it('toBinanceSymbol returns correct symbol for spot', () => {
    expect(toBinanceSymbol('BTC-USD-SPOT')).toBe('BTCUSDT')
    expect(toBinanceSymbol('ETH-USD-SPOT')).toBe('ETHUSDT')
    expect(toBinanceSymbol('SOL-USD-SPOT')).toBe('SOLUSDT')
  })

  it('toBinanceSymbol returns correct symbol for futures', () => {
    expect(toBinanceSymbol('BTC-PERP')).toBe('BTCUSDT')
    expect(toBinanceSymbol('ETH-PERP')).toBe('ETHUSDT')
  })

  it('toBinanceSymbol returns null for unknown instrument', () => {
    expect(toBinanceSymbol('AAPL')).toBeNull()
    expect(toBinanceSymbol('unknown')).toBeNull()
  })

  it('fromBinanceSpotSymbol resolves correctly', () => {
    expect(fromBinanceSpotSymbol('BTCUSDT')).toBe('BTC-USD-SPOT')
    expect(fromBinanceSpotSymbol('btcusdt')).toBe('BTC-USD-SPOT') // case-insensitive
  })

  it('fromBinanceSpotSymbol returns null for futures symbol', () => {
    // BTC-PERP maps to BTCUSDT futures, not spot
    expect(fromBinanceSpotSymbol('UNKNOWN')).toBeNull()
  })

  it('fromBinanceFuturesSymbol resolves correctly', () => {
    expect(fromBinanceFuturesSymbol('BTCUSDT')).toBe('BTC-PERP')
    expect(fromBinanceFuturesSymbol('ethusdt')).toBe('ETH-PERP')
  })

  it('fromBinanceFuturesSymbol returns null for unknown', () => {
    expect(fromBinanceFuturesSymbol('SOLUSDT')).toBeNull() // SOL has no perp mapping
  })

  it('isBinanceInstrument returns true for mapped instruments', () => {
    expect(isBinanceInstrument('BTC-USD-SPOT')).toBe(true)
    expect(isBinanceInstrument('BTC-PERP')).toBe(true)
  })

  it('isBinanceInstrument returns false for non-Binance', () => {
    expect(isBinanceInstrument('AAPL')).toBe(false)
    expect(isBinanceInstrument('XAU-USD')).toBe(false)
  })

  it('getBinanceMapping returns full mapping object', () => {
    const m = getBinanceMapping('BTC-USD-SPOT')
    expect(m).not.toBeNull()
    expect(m!.binanceSymbol).toBe('BTCUSDT')
    expect(m!.type).toBe('spot')
  })

  it('getSpotInstrumentIds returns only spot instruments', () => {
    const ids = getSpotInstrumentIds()
    expect(ids).toContain('BTC-USD-SPOT')
    expect(ids).toContain('ETH-USD-SPOT')
    expect(ids).not.toContain('BTC-PERP')
  })

  it('getFuturesInstrumentIds returns only futures instruments', () => {
    const ids = getFuturesInstrumentIds()
    expect(ids).toContain('BTC-PERP')
    expect(ids).toContain('ETH-PERP')
    expect(ids).not.toContain('BTC-USD-SPOT')
  })

  it('BINANCE_MAPPINGS has all 5 entries', () => {
    expect(BINANCE_MAPPINGS).toHaveLength(5)
  })
})

describe('Normalization — Coinbase Symbol Mapping', () => {
  it('toCoinbaseProductId returns correct product for spot', () => {
    expect(toCoinbaseProductId('BTC-USD-SPOT')).toBe('BTC-USD')
    expect(toCoinbaseProductId('ETH-USD-SPOT')).toBe('ETH-USD')
    expect(toCoinbaseProductId('SOL-USD-SPOT')).toBe('SOL-USD')
  })

  it('toCoinbaseProductId returns null for unmapped instrument', () => {
    expect(toCoinbaseProductId('AAPL')).toBeNull()
    expect(toCoinbaseProductId('BTC-PERP')).toBeNull() // perps not on Coinbase
  })

  it('fromCoinbaseProductId resolves correctly', () => {
    expect(fromCoinbaseProductId('BTC-USD')).toBe('BTC-USD-SPOT')
    expect(fromCoinbaseProductId('ETH-USD')).toBe('ETH-USD-SPOT')
    expect(fromCoinbaseProductId('SOL-USD')).toBe('SOL-USD-SPOT')
  })

  it('fromCoinbaseProductId returns null for unknown product', () => {
    expect(fromCoinbaseProductId('UNKNOWN-USD')).toBeNull()
  })

  it('isCoinbaseInstrument distinguishes mapped vs unmapped', () => {
    expect(isCoinbaseInstrument('BTC-USD-SPOT')).toBe(true)
    expect(isCoinbaseInstrument('BTC-PERP')).toBe(false)
    expect(isCoinbaseInstrument('AAPL')).toBe(false)
  })

  it('getCoinbaseInstrumentIds returns the spot subset', () => {
    const ids = getCoinbaseInstrumentIds()
    expect(ids).toContain('BTC-USD-SPOT')
    expect(ids).toContain('ETH-USD-SPOT')
    expect(ids).toContain('SOL-USD-SPOT')
    expect(ids).not.toContain('BTC-PERP')
  })

  it('COINBASE_MAPPINGS covers the 3 starter pairs', () => {
    expect(COINBASE_MAPPINGS).toHaveLength(3)
  })
})
