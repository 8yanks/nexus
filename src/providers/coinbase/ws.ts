import type { CoinbaseWsEvent } from './types'

// ─── COINBASE WEBSOCKET MANAGER ─────────────────────────────
// Coinbase Exchange WS uses a JSON subscribe message after open
// (unlike Binance, which subscribes via the URL path). This manager
// connects, subscribes to the requested channels for the requested
// product_ids, and re-subscribes on every reconnect.
//
// Reconnection uses exponential backoff capped at 30s, identical to
// the Binance manager (same UX guarantees).

export type CoinbaseWsMessageHandler = (data: CoinbaseWsEvent) => void

export interface CoinbaseWsManagerOptions {
  url: string
  productIds: string[]
  channels: string[]
  onMessage: CoinbaseWsMessageHandler
  onOpen?: () => void
  onClose?: () => void
  onError?: (err: Event) => void
  maxReconnectAttempts?: number
  /**
   * Force-reconnect threshold for silent staleness — see the matching
   * field on the Binance WS manager for the rationale. Coinbase ticker
   * streams emit on every trade (busier than Binance), so the same
   * 30s default is generous. Pass `0` to disable in tests.
   */
  silenceTimeoutMs?: number
}

export interface CoinbaseWsManager {
  connect(): void
  disconnect(): void
  isConnected(): boolean
  /** Wall-clock ms of the last received message (or 0 if none yet). */
  lastMessageAt(): number
}

export const createCoinbaseWsManager = (opts: CoinbaseWsManagerOptions): CoinbaseWsManager => {
  let ws: WebSocket | null = null
  let reconnectAttempts = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let intentionalClose = false
  const maxAttempts = opts.maxReconnectAttempts ?? 10
  const silenceTimeoutMs = opts.silenceTimeoutMs ?? 30_000

  // ── Heartbeat watchdog (mirror of binance/ws.ts) ──────────
  let lastMsgAt = 0
  let watchdog: ReturnType<typeof setInterval> | null = null
  const stopWatchdog = (): void => {
    if (watchdog != null) {
      clearInterval(watchdog)
      watchdog = null
    }
  }
  const startWatchdog = (): void => {
    if (watchdog != null || silenceTimeoutMs <= 0) return
    const sampleMs = Math.max(1_000, Math.min(silenceTimeoutMs / 3, 10_000))
    watchdog = setInterval(() => {
      const silence = Date.now() - lastMsgAt
      if (silence > silenceTimeoutMs && ws?.readyState === WebSocket.OPEN) {
        console.warn(
          `[Coinbase WS] Silence ${silence}ms > ${silenceTimeoutMs}ms — forcing reconnect`,
        )
        try { ws.close() } catch { /* already closing */ }
      }
    }, sampleMs)
  }

  const subscribeMessage = (): string =>
    JSON.stringify({
      type: 'subscribe',
      product_ids: opts.productIds,
      channels: opts.channels,
    })

  const scheduleReconnect = (): void => {
    if (intentionalClose || reconnectAttempts >= maxAttempts) return
    const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000)
    reconnectAttempts++
    console.log(`[Coinbase WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxAttempts})`)
    reconnectTimer = setTimeout(() => connect(), delay)
  }

  const connect = (): void => {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    intentionalClose = false
    console.log(`[Coinbase WS] Connecting to ${opts.url}`)

    try {
      ws = new WebSocket(opts.url)
    } catch (err) {
      console.error('[Coinbase WS] Failed to create WebSocket:', err)
      scheduleReconnect()
      return
    }

    ws.onopen = () => {
      console.log('[Coinbase WS] Connected — subscribing')
      reconnectAttempts = 0
      lastMsgAt = Date.now()
      startWatchdog()
      ws?.send(subscribeMessage())
      opts.onOpen?.()
    }

    ws.onmessage = (event: MessageEvent) => {
      lastMsgAt = Date.now()
      try {
        const parsed = JSON.parse(event.data as string) as CoinbaseWsEvent
        opts.onMessage(parsed)
      } catch {
        // Ignore malformed messages
      }
    }

    ws.onclose = () => {
      console.log('[Coinbase WS] Disconnected')
      stopWatchdog()
      opts.onClose?.()
      if (!intentionalClose) scheduleReconnect()
    }

    ws.onerror = (err: Event) => {
      console.error('[Coinbase WS] Error:', err)
      opts.onError?.(err)
    }
  }

  const disconnect = (): void => {
    intentionalClose = true
    stopWatchdog()
    if (reconnectTimer != null) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (ws) {
      ws.close()
      ws = null
    }
  }

  const isConnected = (): boolean =>
    ws != null && ws.readyState === WebSocket.OPEN

  const lastMessageAt = (): number => lastMsgAt

  return { connect, disconnect, isConnected, lastMessageAt }
}
