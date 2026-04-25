import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createWsManager } from '@/providers/binance/ws'

// ─── BINANCE WS — heartbeat watchdog ─────────────────────────
// The browser's WebSocket can stay in OPEN state long after the
// connection has died (zombie sockets behind NAT / corporate
// proxies). The watchdog tracks message arrival time and forces a
// reconnect when silence exceeds the threshold. These tests exercise
// that path with a mock WebSocket + fake timers.

interface MockWsInstance {
  url: string
  readyState: number
  onopen: ((this: WebSocket, ev: Event) => unknown) | null
  onmessage: ((this: WebSocket, ev: MessageEvent) => unknown) | null
  onclose: ((this: WebSocket, ev: CloseEvent) => unknown) | null
  onerror: ((this: WebSocket, ev: Event) => unknown) | null
  send: (data: string) => void
  close: () => void
  // Test helpers
  __open: () => void
  __message: (data: unknown) => void
  __close: () => void
}

const createMockWs = (): {
  instances: MockWsInstance[]
  ctor: typeof WebSocket
} => {
  const instances: MockWsInstance[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Ctor: any = function (this: MockWsInstance, url: string) {
    this.url = url
    this.readyState = 0 // CONNECTING
    this.onopen = null
    this.onmessage = null
    this.onclose = null
    this.onerror = null
    this.send = vi.fn() as never
    this.close = function () {
      this.readyState = 3 // CLOSED
      this.onclose?.call(this as unknown as WebSocket, new CloseEvent('close'))
    } as never
    this.__open = function () {
      this.readyState = 1 // OPEN
      this.onopen?.call(this as unknown as WebSocket, new Event('open'))
    }
    this.__message = function (data: unknown) {
      this.onmessage?.call(
        this as unknown as WebSocket,
        new MessageEvent('message', { data: JSON.stringify(data) }),
      )
    }
    this.__close = function () {
      this.readyState = 3
      this.onclose?.call(this as unknown as WebSocket, new CloseEvent('close'))
    }
    instances.push(this)
  }
  Ctor.OPEN = 1
  Ctor.CONNECTING = 0
  Ctor.CLOSING = 2
  Ctor.CLOSED = 3
  return { instances, ctor: Ctor as typeof WebSocket }
}

describe('createWsManager — heartbeat watchdog', () => {
  let mock: ReturnType<typeof createMockWs>
  let originalWs: typeof WebSocket

  beforeEach(() => {
    vi.useFakeTimers()
    mock = createMockWs()
    originalWs = globalThis.WebSocket
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).WebSocket = mock.ctor
  })

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).WebSocket = originalWs
    vi.useRealTimers()
  })

  it('exposes lastMessageAt() that returns 0 before any message', () => {
    const mgr = createWsManager({
      baseUrl: 'wss://example',
      streams: ['x'],
      onMessage: vi.fn(),
    })
    mgr.connect()
    expect(mgr.lastMessageAt()).toBe(0)
  })

  it('updates lastMessageAt() on every received message', () => {
    const mgr = createWsManager({
      baseUrl: 'wss://example',
      streams: ['x'],
      onMessage: vi.fn(),
    })
    mgr.connect()
    const ws = mock.instances[0]
    ws.__open()
    const t0 = mgr.lastMessageAt()
    expect(t0).toBeGreaterThan(0)

    vi.advanceTimersByTime(500)
    ws.__message({ stream: 'x', data: {} })
    expect(mgr.lastMessageAt()).toBeGreaterThan(t0)
  })

  it('forces reconnect when silence exceeds silenceTimeoutMs', () => {
    const mgr = createWsManager({
      baseUrl: 'wss://example',
      streams: ['x'],
      onMessage: vi.fn(),
      silenceTimeoutMs: 5_000,
    })
    mgr.connect()
    const first = mock.instances[0]
    first.__open()

    // Advance past the silence threshold without ever sending a
    // message. The watchdog samples at silenceTimeoutMs/3 ≈ 1666ms,
    // capped at 10s, floored at 1s. So after ~6s of nothing the
    // watchdog should have closed the socket and triggered reconnect.
    vi.advanceTimersByTime(7_000)

    // The watchdog calls .close() which fires onclose → scheduleReconnect.
    // scheduleReconnect uses setTimeout(connect, 1000) for the first attempt.
    expect(first.readyState).toBe(3) // CLOSED
    vi.advanceTimersByTime(2_000)
    expect(mock.instances.length).toBeGreaterThanOrEqual(2)
  })

  it('does NOT close while messages keep arriving inside the threshold', () => {
    const mgr = createWsManager({
      baseUrl: 'wss://example',
      streams: ['x'],
      onMessage: vi.fn(),
      silenceTimeoutMs: 5_000,
    })
    mgr.connect()
    const ws = mock.instances[0]
    ws.__open()

    // Send a message every 2s for 10s total — well below the 5s
    // silence cap, so the socket should stay open.
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(2_000)
      ws.__message({ stream: 'x', data: { i } })
    }
    expect(ws.readyState).toBe(1) // still OPEN
    expect(mock.instances.length).toBe(1) // no reconnect spawned
  })

  it('silenceTimeoutMs=0 disables the watchdog entirely', () => {
    const mgr = createWsManager({
      baseUrl: 'wss://example',
      streams: ['x'],
      onMessage: vi.fn(),
      silenceTimeoutMs: 0,
    })
    mgr.connect()
    const ws = mock.instances[0]
    ws.__open()

    vi.advanceTimersByTime(120_000) // 2 minutes of silence
    expect(ws.readyState).toBe(1) // still OPEN — watchdog never fired
    expect(mock.instances.length).toBe(1)
  })

  it('disconnect() stops the watchdog so it cannot fire after teardown', () => {
    const mgr = createWsManager({
      baseUrl: 'wss://example',
      streams: ['x'],
      onMessage: vi.fn(),
      silenceTimeoutMs: 5_000,
    })
    mgr.connect()
    mock.instances[0].__open()
    mgr.disconnect()

    // Even way past the silence threshold, no second WS instance
    // should appear — disconnect set intentionalClose AND killed the
    // watchdog interval.
    vi.advanceTimersByTime(60_000)
    expect(mock.instances.length).toBe(1)
  })
})
