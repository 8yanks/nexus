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
}

export interface CoinbaseWsManager {
  connect(): void
  disconnect(): void
  isConnected(): boolean
}

export const createCoinbaseWsManager = (opts: CoinbaseWsManagerOptions): CoinbaseWsManager => {
  let ws: WebSocket | null = null
  let reconnectAttempts = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let intentionalClose = false
  const maxAttempts = opts.maxReconnectAttempts ?? 10

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
      ws?.send(subscribeMessage())
      opts.onOpen?.()
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data as string) as CoinbaseWsEvent
        opts.onMessage(parsed)
      } catch {
        // Ignore malformed messages
      }
    }

    ws.onclose = () => {
      console.log('[Coinbase WS] Disconnected')
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

  return { connect, disconnect, isConnected }
}
