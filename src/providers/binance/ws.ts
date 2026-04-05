import type { BinanceWsCombinedStream } from './types'

// ─── WEBSOCKET MANAGER ──────────────────────────────────────
// Manages a single combined-stream WebSocket connection to Binance.
// Handles reconnection with exponential backoff.

export type WsMessageHandler = (data: BinanceWsCombinedStream) => void

export interface WsManagerOptions {
  baseUrl: string
  streams: string[]
  onMessage: WsMessageHandler
  onOpen?: () => void
  onClose?: () => void
  onError?: (err: Event) => void
  maxReconnectAttempts?: number
}

export interface WsManager {
  connect(): void
  disconnect(): void
  isConnected(): boolean
}

export const createWsManager = (opts: WsManagerOptions): WsManager => {
  let ws: WebSocket | null = null
  let reconnectAttempts = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let intentionalClose = false
  const maxAttempts = opts.maxReconnectAttempts ?? 10

  const getUrl = (): string => {
    const streams = opts.streams.join('/')
    return `${opts.baseUrl}/stream?streams=${streams}`
  }

  const scheduleReconnect = (): void => {
    if (intentionalClose || reconnectAttempts >= maxAttempts) return
    const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000)
    reconnectAttempts++
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxAttempts})`)
    reconnectTimer = setTimeout(() => connect(), delay)
  }

  const connect = (): void => {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    intentionalClose = false
    const url = getUrl()
    console.log(`[WS] Connecting to ${url}`)

    try {
      ws = new WebSocket(url)
    } catch (err) {
      console.error('[WS] Failed to create WebSocket:', err)
      scheduleReconnect()
      return
    }

    ws.onopen = () => {
      console.log('[WS] Connected')
      reconnectAttempts = 0
      opts.onOpen?.()
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data as string) as BinanceWsCombinedStream
        opts.onMessage(parsed)
      } catch {
        // Ignore malformed messages
      }
    }

    ws.onclose = () => {
      console.log('[WS] Disconnected')
      opts.onClose?.()
      if (!intentionalClose) scheduleReconnect()
    }

    ws.onerror = (err: Event) => {
      console.error('[WS] Error:', err)
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
