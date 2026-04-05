// ─── NEXUS TRADER BOT ───────────────────────────────────────
// Consumes Analyst signals, validates through Sentinel veto,
// and executes trades via Freqtrade (dry-run by default).
//
// Architecture:
//   Signal (Analyst) → Filter → Veto (Sentinel) → Execute (Freqtrade)
//
// SAFETY: Live trading is disabled by default. The Freqtrade
// bridge is a skeleton — actual HTTP calls require a running
// Freqtrade instance.

// Signal consumer
export { consumeSignal, filterSignal, getPipelineEvents, clearPipelineEvents } from './signal-consumer'
export type { SignalFilterConfig } from './signal-consumer'

// Freqtrade bridge
export {
  configureFreqtrade,
  getFreqtradeConfig,
  getFreqtradeStatus,
  checkConnection,
  submitOrder,
  getOpenTrades,
  isDryRun,
} from './freqtrade-bridge'

// Pipeline
export { executeSignal, setDrawdown, getDrawdown, getPipelineLog, clearPipelineLog } from './pipeline'
export type { PipelineConfig } from './pipeline'

// Types
export type {
  TradeSignal,
  Order,
  OrderSide,
  OrderType,
  OrderStatus,
  Position,
  PositionSide,
  FreqtradeConfig,
  FreqtradeStatus,
  PipelineStage,
  PipelineEvent,
} from './types'
