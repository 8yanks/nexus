// ─── BINANCE REST RESPONSE TYPES ────────────────────────────

export interface BinanceRestTicker {
  symbol: string
  lastPrice: string
  bidPrice: string
  askPrice: string
  highPrice: string
  lowPrice: string
  volume: string
  quoteVolume: string
  priceChange: string
  priceChangePercent: string
}

export interface BinanceFuturesRestTicker {
  symbol: string
  lastPrice: string
  bidPrice: string
  askPrice: string
  highPrice: string
  lowPrice: string
  volume: string
  quoteVolume: string
  priceChange: string
  priceChangePercent: string
}

export interface BinancePremiumIndex {
  symbol: string
  markPrice: string
  lastFundingRate: string
  nextFundingTime: number
}

export interface BinanceFuturesOI {
  symbol: string
  openInterest: string
}

export interface BinanceBookTicker {
  symbol: string
  bidPrice: string
  bidQty: string
  askPrice: string
  askQty: string
}

// ─── BINANCE WS EVENT TYPES ────────────────────────────────

export interface BinanceWsTickerEvent {
  e: '24hrTicker'
  s: string       // symbol
  c: string       // last price
  b: string       // best bid
  a: string       // best ask
  h: string       // high 24h
  l: string       // low 24h
  v: string       // base volume
  q: string       // quote volume
  p: string       // price change
  P: string       // price change %
  E: number       // event time
}

export interface BinanceWsKlineEvent {
  e: 'kline'
  s: string
  k: {
    t: number     // start time
    o: string     // open
    h: string     // high
    l: string     // low
    c: string     // close
    v: string     // volume
    x: boolean    // is final
    i: string     // interval
  }
}

export interface BinanceWsMarkPriceEvent {
  e: 'markPriceUpdate'
  s: string       // symbol
  p: string       // mark price
  r: string       // funding rate
  T: number       // next funding time
}

export interface BinanceWsCombinedStream {
  stream: string
  data: BinanceWsTickerEvent | BinanceWsKlineEvent | BinanceWsMarkPriceEvent
}
