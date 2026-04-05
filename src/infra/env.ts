// ─── ENVIRONMENT CONFIGURATION ──────────────────────────────
// Central config from import.meta.env (Vite). All secrets stay
// in .env files — never hardcoded, never committed.
//
// .env.local (gitignored):
//   VITE_BINANCE_API_KEY=...
//   VITE_POLYGON_API_KEY=...
//   VITE_FINNHUB_API_KEY=...
//   VITE_FRED_API_KEY=...

const env = import.meta.env

export const config = {
  // Mode
  isDev: env.DEV === true,
  isProd: env.PROD === true,
  mode: env.MODE as string,

  // Binance
  binanceWsUrl: (env.VITE_BINANCE_WS_URL as string) || 'wss://stream.binance.com:9443',
  binanceRestUrl: (env.VITE_BINANCE_REST_URL as string) || 'https://api.binance.com',
  binanceFuturesWsUrl: (env.VITE_BINANCE_FUTURES_WS_URL as string) || 'wss://fstream.binance.com',
  binanceFuturesRestUrl: (env.VITE_BINANCE_FUTURES_REST_URL as string) || 'https://fapi.binance.com',

  // API Keys (optional — only needed when connecting live providers)
  polygonApiKey: (env.VITE_POLYGON_API_KEY as string) || '',
  finnhubApiKey: (env.VITE_FINNHUB_API_KEY as string) || '',
  fredApiKey: (env.VITE_FRED_API_KEY as string) || '',

  // Refresh
  refreshIntervalMs: parseInt((env.VITE_REFRESH_INTERVAL_MS as string) || '5000', 10),
  wsReconnectMaxAttempts: parseInt((env.VITE_WS_RECONNECT_MAX as string) || '10', 10),
  wsReconnectMaxDelayMs: parseInt((env.VITE_WS_RECONNECT_MAX_DELAY as string) || '30000', 10),

  // Storage
  idbRetentionDays: parseInt((env.VITE_IDB_RETENTION_DAYS as string) || '7', 10),
  signalRetentionDays: parseInt((env.VITE_SIGNAL_RETENTION_DAYS as string) || '30', 10),
} as const

export type AppConfig = typeof config
