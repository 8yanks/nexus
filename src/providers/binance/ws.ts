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
  /**
   * If no message arrives for this many ms while the socket reports
   * OPEN, the watchdog calls `ws.close()` to force a reconnect via
   * the existing onclose path. Defaults to 30000 (30s) — Binance
   * combined ticker streams emit every 1-2s under normal load, so a
   * 30s silence is unambiguously a dead connection.
   *
   * Pass `0` to disable the watchdog entirely (used in tests where
   * we want deterministic message-driven control).
   */
  silenceTimeoutMs?: number
}

export interface WsManager {
  connect(): void
  disconnect(): void
  isConnected(): boolean
  /** Wall-clock ms of the last received message (or 0 if none yet). */
  lastMessageAt(): number
}

export const createWsManager = (opts: WsManagerOptions): WsManager => {
  let ws: WebSocket | null = null
  let reconnectAttempts = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let intentionalClose = false
  const maxAttempts = opts.maxReconnectAttempts ?? 10
  const silenceTimeoutMs = opts.silenceTimeoutMs ?? 30_000

  // ── Heartbeat watchdog ────────────────────────────────────
  // The browser's WebSocket can stay in OPEN state long after the
  // connection has died at the network layer (zombie sockets behind
  // some NATs / corporate proxies). The onclose path handles loud
  // disconnects with exponential backoff, but silent staleness goes
  // unnoticed. The watchdog tracks message arrival time and forces
  // a reconnect once the silence exceeds `silenceTimeoutMs`.
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
    // Sample frequently enough to react within ~1/3 of the timeout —
    // capped at 10s to stay light when the timeout itself is generous.
    const sampleMs = Math.max(1_000, Math.min(silenceTimeoutMs / 3, 10_000))
    watchdog = setInterval(() => {
      const silence = Date.now() - lastMsgAt
      if (silence > silenceTimeoutMs && ws?.readyState === WebSocket.OPEN) {
        console.warn(
          `[WS] Silence ${silence}ms > ${silenceTimeoutMs}ms — forcing reconnect`,
        )
        // Tear down the current socket; onclose schedules a fresh one.
        try { ws.close() } catch { /* already closing */ }
      }
    }, sampleMs)
  }

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
      // Reset the silence baseline at open so a slow first message
      // doesn't immediately trip the watchdog.
      lastMsgAt = Date.now()
      startWatchdog()
      opts.onOpen?.()
    }

    ws.onmessage = (event: MessageEvent) => {
      lastMsgAt = Date.now()
      try {
        const parsed = JSON.parse(event.data as string) as BinanceWsCombinedStream
        opts.onMessage(parsed)
      } catch {
        // Ignore malformed messages
      }
    }

    ws.onclose = () => {
      console.log('[WS] Disconnected')
      stopWatchdog()
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
