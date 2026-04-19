// ─── COINBASE EXCHANGE REST RESPONSE TYPES ──────────────────
// Coinbase Exchange (a.k.a. Coinbase Pro) public market-data API.
// All endpoints below require no auth and support browser CORS.
// Docs: https://docs.cdp.coinbase.com/exchange/docs/welcome

export interface CoinbaseRestTicker {
  trade_id: number
  price: string
  size: string
  time: string         // ISO-8601
  bid: string
  ask: string
  volume: string       // 24h base volume
}

export interface CoinbaseRest24hStats {
  open: string
  high: string
  low: string
  last: string
  volume: string       // 24h base volume
  volume_30day: string
}

// Coinbase REST candles return arrays of:
// [time(s), low, high, open, close, volume]  in DESCENDING time order.
export type CoinbaseRestCandle = [number, number, number, number, number, number]

// ─── COINBASE WS EVENT TYPES ────────────────────────────────

export interface CoinbaseWsTickerEvent {
  type: 'ticker'
  sequence: number
  product_id: string
  price: string
  open_24h: string
  volume_24h: string
  low_24h: string
  high_24h: string
  volume_30d: string
  best_bid: string
  best_bid_size: string
  best_ask: string
  best_ask_size: string
  side: 'buy' | 'sell'
  time: string         // ISO-8601
  trade_id: number
  last_size: string
}

export interface CoinbaseWsSubscriptionsEvent {
  type: 'subscriptions'
  channels: Array<{ name: string; product_ids: string[] }>
}

export interface CoinbaseWsErrorEvent {
  type: 'error'
  message: string
  reason?: string
}

export type CoinbaseWsEvent =
  | CoinbaseWsTickerEvent
  | CoinbaseWsSubscriptionsEvent
  | CoinbaseWsErrorEvent
