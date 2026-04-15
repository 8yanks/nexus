import type { AIProvider } from '@/ai/orchestrator'
import type { AnalystContext } from '@/analyst/context-builder'

export interface ClaudeProviderOptions {
  apiKey: string
  model?: string
  /** Override fetch (for tests / proxies). */
  fetchImpl?: typeof fetch
  /** Endpoint override (proxy, mock server, etc.). */
  endpoint?: string
  /** Max tokens for the response. */
  maxTokens?: number
}

const DEFAULT_ENDPOINT = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-sonnet-4-5'
const DEFAULT_MAX_TOKENS = 1024

/**
 * The model is instructed to emit ONLY a JSON object matching TradeDecision.
 * No reasoning text, no markdown, no commentary — anything non-JSON gets
 * rejected by the orchestrator's validator.
 */
const SYSTEM_PROMPT = `You are NEXUS's decision model. You receive a structured market context
and MUST reply with a single JSON object matching this TypeScript type:

{
  "id": string,
  "timestamp": number,
  "instrumentId": string,
  "symbol": string,
  "action": "BUY" | "SELL" | "HOLD",
  "size": number,
  "entryPrice": number | null,
  "stopLoss": number | null,
  "takeProfit": number | null,
  "confidence": number,      // 0..1
  "riskLevel": "low" | "medium" | "high" | "extreme",
  "horizon": "scalp" | "intraday" | "swing" | "position",
  "thesis": string,
  "keyFactors": string[],
  "invalidators": string[],
  "requiresHumanReview": boolean,
  "modelSource": string,
  "consensusScore": number | null,
  "_source": string,
  "_status": "LIVE" | "DELAYED" | "SIMULATED" | "STALE" | "UNAVAILABLE" | "ERROR",
  "_contextHash": string
}

Rules:
- HOLD must have size=0, entryPrice=null, stopLoss=null, takeProfit=null.
- BUY/SELL must have size>0 and all three prices set.
- Reply with JSON only. No markdown fences, no prose.`

function extractJson(text: string): unknown {
  const trimmed = text.trim()
  // Strip code fences if the model added them despite instructions.
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  const candidate = fenceMatch ? fenceMatch[1] : trimmed
  return JSON.parse(candidate)
}

/**
 * Production AIProvider backed by the Anthropic Messages API. The response
 * is parsed as JSON and handed straight to the orchestrator's validator —
 * malformed output is rejected with an audit entry rather than executed.
 */
export function claudeProvider(
  getContext: () => AnalystContext,
  opts: ClaudeProviderOptions,
): AIProvider {
  const fetchImpl = opts.fetchImpl ?? fetch
  const endpoint = opts.endpoint ?? DEFAULT_ENDPOINT
  const model = opts.model ?? DEFAULT_MODEL
  const maxTokens = opts.maxTokens ?? DEFAULT_MAX_TOKENS

  return {
    id: `claude:${model}`,
    propose: async () => {
      const ctx = getContext()
      const userPayload = {
        instrumentId: ctx.instrumentId,
        symbol: ctx.symbol,
        price: ctx.price,
        contextHash: ctx.contextHash,
        builtAt: ctx.builtAt,
        signals: ctx.signals.map((s) => ({
          type: s.type,
          direction: s.direction,
          strength: s.strength,
          description: s.description,
        })),
        quality: ctx.quality
          ? {
              overall: ctx.quality.overallScore,
              status: ctx.quality._status,
              issues: ctx.quality.issues,
            }
          : null,
      }

      const res = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': opts.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: JSON.stringify(userPayload),
            },
          ],
        }),
      })

      if (!res.ok) {
        throw new Error(`Claude API ${res.status}: ${await res.text()}`)
      }
      const body = (await res.json()) as {
        content?: Array<{ type: string; text?: string }>
      }
      const text =
        body.content?.find((c) => c.type === 'text')?.text ?? ''
      if (!text) throw new Error('Claude returned no text content')
      return extractJson(text)
    },
  }
}
