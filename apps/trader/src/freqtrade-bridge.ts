// ─── FREQTRADE BRIDGE ───────────────────────────────────────
// Interfaces with a running Freqtrade instance via its REST API.
// All methods are async and return typed results.
//
// IMPORTANT: This is a SKELETON. Actual HTTP calls to Freqtrade
// are stubbed — real implementation requires a running Freqtrade
// instance and will be wired in a future iteration.

import type { FreqtradeConfig, FreqtradeStatus, Order, OrderSide } from './types'

// ─── DEFAULTS ──────────────────────────────────────────────

const DEFAULT_CONFIG: FreqtradeConfig = {
  apiUrl: 'http://localhost:8080',
  apiToken: '',
  dryRun: true,     // ALWAYS dry-run by default — safety first
  maxOpenTrades: 5,
  stakeAmount: 100,
  stakeCurrency: 'USDT',
}

// ─── STATE ─────────────────────────────────────────────────

let currentConfig: FreqtradeConfig = { ...DEFAULT_CONFIG }
let currentStatus: FreqtradeStatus = {
  connected: false,
  version: null,
  botState: null,
  openTradeCount: 0,
  totalProfit: 0,
  lastUpdate: null,
}

// ─── BRIDGE API ────────────────────────────────────────────

export const configureFreqtrade = (overrides: Partial<FreqtradeConfig> = {}): FreqtradeConfig => {
  currentConfig = { ...DEFAULT_CONFIG, ...overrides }
  return { ...currentConfig }
}

export const getFreqtradeConfig = (): FreqtradeConfig => ({ ...currentConfig })

export const getFreqtradeStatus = (): FreqtradeStatus => ({ ...currentStatus })

/**
 * Check connection to Freqtrade API.
 * STUB: Always returns disconnected until real HTTP integration.
 */
export const checkConnection = async (): Promise<FreqtradeStatus> => {
  // TODO: Real implementation:
  // const res = await fetch(`${currentConfig.apiUrl}/api/v1/ping`, { headers: ... })
  currentStatus = {
    ...currentStatus,
    connected: false,
    version: null,
    botState: null,
    lastUpdate: new Date().toISOString(),
  }
  return { ...currentStatus }
}

/**
 * Submit an order to Freqtrade.
 * STUB: Returns a mock rejected order until real HTTP integration.
 */
export const submitOrder = async (
  instrumentId: string,
  side: OrderSide,
  signalId: string,
): Promise<Order> => {
  // Safety: always check dry_run
  if (!currentConfig.dryRun) {
    throw new Error('SAFETY: Live trading is disabled. Set dryRun: true to use paper trading.')
  }

  // TODO: Real implementation:
  // POST to Freqtrade /api/v1/forcebuy or /api/v1/forcesell

  const order: Order = {
    id: `ord_${Date.now()}`,
    instrumentId,
    side,
    type: 'market',
    quantity: currentConfig.stakeAmount,
    price: null,
    stopPrice: null,
    status: 'rejected',  // Stub: always rejected until real integration
    signalId,
    vetoDecisionId: null,
    createdAt: new Date().toISOString(),
    filledAt: null,
    filledPrice: null,
    filledQuantity: null,
  }

  return order
}

/**
 * Fetch open trades from Freqtrade.
 * STUB: Returns empty array until real HTTP integration.
 */
export const getOpenTrades = async (): Promise<Order[]> => {
  // TODO: GET /api/v1/status
  return []
}

/**
 * Check if Freqtrade is in dry-run mode.
 * Returns true if config is dry-run OR if not connected.
 */
export const isDryRun = (): boolean => currentConfig.dryRun || !currentStatus.connected
