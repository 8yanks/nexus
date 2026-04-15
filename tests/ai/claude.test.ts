import { describe, it, expect, vi } from 'vitest'
import { claudeProvider } from '@/ai/providers/claude'
import { validateTradeDecision } from '@/ai/schemas'
import type { AnalystContext } from '@/analyst/context-builder'

const ctx: AnalystContext = {
  instrumentId: 'BTCUSD',
  symbol: 'BTC/USD',
  price: 60000,
  snapshot: {} as never,
  signals: [],
  quality: null,
  contextHash: 'h',
  builtAt: 0,
}

const buildDecisionText = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    id: 'd',
    timestamp: 1,
    instrumentId: 'BTCUSD',
    symbol: 'BTC/USD',
    action: 'BUY',
    size: 0.1,
    entryPrice: 60000,
    stopLoss: 58000,
    takeProfit: 65000,
    confidence: 0.7,
    riskLevel: 'medium',
    horizon: 'intraday',
    thesis: 'tst',
    keyFactors: [],
    invalidators: [],
    requiresHumanReview: false,
    modelSource: 'claude',
    consensusScore: null,
    _source: 'ai_orchestrator',
    _status: 'LIVE',
    _contextHash: 'h',
    ...over,
  })

const okResponse = (text: string) =>
  new Response(JSON.stringify({ content: [{ type: 'text', text }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

describe('claudeProvider', () => {
  it('parses a well-formed JSON response', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(okResponse(buildDecisionText()))
    const p = claudeProvider(() => ctx, {
      apiKey: 'key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    const raw = await p.propose('h', {})
    expect(validateTradeDecision(raw).ok).toBe(true)
    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it('strips code fences if the model adds them', async () => {
    const wrapped = '```json\n' + buildDecisionText() + '\n```'
    const fetchImpl = vi.fn().mockResolvedValue(okResponse(wrapped))
    const p = claudeProvider(() => ctx, {
      apiKey: 'key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    const raw = await p.propose('h', {})
    expect(validateTradeDecision(raw).ok).toBe(true)
  })

  it('throws on non-2xx response when retries exhausted', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response('nope', { status: 500 }))
    const p = claudeProvider(() => ctx, {
      apiKey: 'key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      maxRetries: 0,
    })
    await expect(p.propose('h', {})).rejects.toThrow(/500/)
  })

  it('does not retry 4xx client errors', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response('bad key', { status: 401 }))
    const p = claudeProvider(() => ctx, {
      apiKey: 'key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      maxRetries: 3,
    })
    await expect(p.propose('h', {})).rejects.toThrow(/401/)
    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it('retries on 429 then succeeds', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('rate', { status: 429 }))
      .mockResolvedValueOnce(okResponse(buildDecisionText()))
    const p = claudeProvider(() => ctx, {
      apiKey: 'key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      maxRetries: 2,
    })
    const raw = await p.propose('h', {})
    expect(validateTradeDecision(raw).ok).toBe(true)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  }, 10_000)

  it('retries on 5xx until success', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('e', { status: 503 }))
      .mockResolvedValueOnce(new Response('e', { status: 502 }))
      .mockResolvedValueOnce(okResponse(buildDecisionText()))
    const p = claudeProvider(() => ctx, {
      apiKey: 'key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      maxRetries: 2,
    })
    const raw = await p.propose('h', {})
    expect(validateTradeDecision(raw).ok).toBe(true)
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  }, 10_000)

  it('aborts the request after timeoutMs', async () => {
    const fetchImpl = vi.fn().mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            const e = new Error('aborted')
            e.name = 'AbortError'
            reject(e)
          })
        }),
    )
    const p = claudeProvider(() => ctx, {
      apiKey: 'key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 50,
      maxRetries: 0,
    })
    await expect(p.propose('h', {})).rejects.toThrow(/abort/i)
  })

  it('throws when response has no text content', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ content: [] }), { status: 200 }),
      )
    const p = claudeProvider(() => ctx, {
      apiKey: 'key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    await expect(p.propose('h', {})).rejects.toThrow(/no text/i)
  })

  it('sends required Anthropic headers', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(okResponse(buildDecisionText()))
    const p = claudeProvider(() => ctx, {
      apiKey: 'sk-test',
      model: 'claude-opus-4',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    await p.propose('h', {})
    const [, init] = fetchImpl.mock.calls[0]
    const headers = (init as { headers: Record<string, string> }).headers
    expect(headers['x-api-key']).toBe('sk-test')
    expect(headers['anthropic-version']).toBe('2023-06-01')
    const body = JSON.parse((init as { body: string }).body)
    expect(body.model).toBe('claude-opus-4')
  })
})
