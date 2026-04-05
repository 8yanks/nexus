import type {
  Instrument,
  MarketSnapshot,
  OHLCV,
  CandleSeries,
  DataProvenance,
  DataQualityMetrics,
} from '@/types'

// ─── BASE PRICES ─────────────────────────────────────────────

const BASE_PRICES: Record<string, number> = {
  'BTC-USD-SPOT': 67842.50, 'ETH-USD-SPOT': 3521.80, 'SOL-USD-SPOT': 178.42,
  'BTC-PERP':     67855.00, 'ETH-PERP':     3523.50,
  'AAPL': 198.45, 'MSFT': 442.30, 'NVDA': 875.60, 'TSLA': 248.90,
  'EUR-USD': 1.08542, 'GBP-USD': 1.26830, 'USD-JPY': 154.320,
  'SPX': 5284.50, 'NDX': 18520.30,
  'XAU-USD': 2345.60, 'XAG-USD': 29.85, 'WTI': 78.42, 'NG': 2.74, 'HG': 4.28,
}

const TF_MS: Record<string, number> = {
  '1m': 60e3, '5m': 3e5, '1h': 36e5, '4h': 144e5, '1d': 864e5,
}

const TF_VOL: Record<string, number> = {
  '1m': 0.001, '5m': 0.002, '1h': 0.005, '4h': 0.01, '1d': 0.02,
}

// ─── LOW-LEVEL GENERATORS ────────────────────────────────────

const genPrice = (base: number, volatility = 0.002): number => {
  return base + (Math.random() - 0.5) * 2 * volatility * base
}

const genOHLCV = (base: number, tf = '1h', timestamp: string): OHLCV => {
  const vol = TF_VOL[tf] ?? 0.005
  const open = genPrice(base, vol)
  const high = open * (1 + Math.random() * vol * 2)
  const low  = open * (1 - Math.random() * vol * 2)
  const close = low + Math.random() * (high - low)
  return {
    open, high, low, close,
    volume: Math.floor(Math.random() * 1e7 + 1e5),
    timestamp,
    _source: 'mock_provider',
    _status: 'SIMULATED',
  }
}

// ─── PROVENANCE FACTORY ──────────────────────────────────────

const mockProvenance = (): DataProvenance => ({
  source: 'mock_provider',
  fetchMethod: 'mock',
  latencyMs: null,
  timestamp: new Date().toISOString(),
  receivedAt: new Date().toISOString(),
})

// ─── QUALITY METRICS FOR MOCK ────────────────────────────────

const mockQuality = (completeness: number): DataQualityMetrics => ({
  completeness,
  timeliness: 1,     // always fresh (just generated)
  accuracy: 0,       // simulated — not real market data
  consistency: 1,    // internally consistent by construction
})

// ─── PUBLIC GENERATORS ───────────────────────────────────────

export const generateCandles = (
  instrumentId: string,
  tf = '1h',
  count = 100,
): CandleSeries => {
  const base = BASE_PRICES[instrumentId] ?? 100
  const tfMs = TF_MS[tf] ?? 36e5
  const now = Date.now()
  const candles: OHLCV[] = []
  let price = base * 0.95

  for (let i = count; i > 0; i--) {
    const timestamp = new Date(now - i * tfMs).toISOString()
    const candle = genOHLCV(price, tf, timestamp)
    price = candle.close
    candles.push(candle)
  }

  return {
    instrumentId,
    timeframe: tf,
    candles,
    _source: 'mock_provider',
    _status: 'SIMULATED',
    _provenance: mockProvenance(),
    generatedAt: new Date().toISOString(),
  }
}

export const generateSnapshot = (inst: Instrument): MarketSnapshot => {
  const base = BASE_PRICES[inst.id] ?? 100
  const price = genPrice(base)
  const spreadPct =
    inst.assetClass === 'forex'
      ? 0.00002
      : inst.assetClass.startsWith('crypto')
        ? 0.0005
        : 0.001
  const spread = price * spreadPct
  const change24h = (Math.random() - 0.45) * 0.06
  const isCrypto = inst.assetClass.startsWith('crypto')

  // count populated optional fields for completeness
  const hasOI = isCrypto
  const hasFunding = inst.assetClass === 'crypto_perp'
  const hasLiquidations = isCrypto
  const fieldCount = 5 + (hasOI ? 1 : 0) + (hasFunding ? 1 : 0) + (hasLiquidations ? 1 : 0)
  const completeness = fieldCount / 8

  return {
    instrumentId: inst.id,
    price,
    bid: price - spread / 2,
    ask: price + spread / 2,
    spread,
    spreadBps: Math.round(spreadPct * 10000 * 100) / 100,
    change24h,
    change24hPct: change24h * 100,
    high24h: price * (1 + Math.abs(change24h) + 0.01),
    low24h:  price * (1 - Math.abs(change24h) - 0.01),
    volume24h: Math.floor(Math.random() * 5e9 + 1e7),
    openInterest:   hasOI        ? Math.floor(Math.random() * 2e10 + 1e8) : null,
    fundingRate:    hasFunding   ? (Math.random() - 0.5) * 0.001          : null,
    nextFunding:    hasFunding   ? new Date(Date.now() + Math.random() * 288e5).toISOString() : null,
    liquidations24h: hasLiquidations ? Math.floor(Math.random() * 5e7)   : null,
    vwap: null,   // computed by analytics engine, not the mock
    _source: 'mock_provider',
    _status: 'SIMULATED',
    _provenance: mockProvenance(),
    _quality: mockQuality(completeness),
  }
}
