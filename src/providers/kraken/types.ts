// ─── KRAKEN PUBLIC REST TYPES ───────────────────────────────
// Public market-data endpoints at api.kraken.com/0/public/*.
// No API key, CORS OK. We use:
//   /Ticker — current bid/ask/last + 24h aggregates
//   /OHLC   — candles (minute/hour/day buckets)
//   /Time   — server clock (health check)
//
// Kraken uses legacy X/Z prefixes for some assets (X for crypto, Z
// for fiat) so `XBTUSD` round-trips as `XXBTZUSD` in response keys.
// The provider does NOT assume the response key matches the request
// pair — it reads `Object.values(result)[0]`.

export interface KrakenTickerPair {
  a: [string, string, string]  // ask [price, whole-lot volume, lot volume]
  b: [string, string, string]  // bid
  c: [string, string]           // last trade [price, volume]
  v: [string, string]           // volume [today, last 24h]
  p: [string, string]           // VWAP  [today, last 24h]
  t: [number, number]           // trade count [today, last 24h]
  l: [string, string]           // low  [today, last 24h]
  h: [string, string]           // high [today, last 24h]
  o: string                     // today opening (00:00 UTC)
}

export interface KrakenTickerResponse {
  error: string[]
  result: Record<string, KrakenTickerPair>
}

// OHLC row: [time_s, open, high, low, close, vwap, volume, count]
// Numeric fields come back as strings — we Number() them at the edge.
export type KrakenOHLCRow = [number, string, string, string, string, string, string, number]

export interface KrakenOHLCResponse {
  error: string[]
  result: Record<string, KrakenOHLCRow[] | number> & {
    last?: number   // polling cursor — ignored here, we pull full history
  }
}
