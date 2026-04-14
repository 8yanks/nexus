import type {
  TradeDecision,
  DecisionAction,
  DecisionRisk,
  DecisionHorizon,
} from '@/types/decision'

export type ValidationError = { path: string; message: string }
export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: ValidationError[] }

const ACTIONS: DecisionAction[] = ['BUY', 'SELL', 'HOLD']
const RISKS: DecisionRisk[] = ['low', 'medium', 'high', 'extreme']
const HORIZONS: DecisionHorizon[] = ['scalp', 'intraday', 'swing', 'position']

function isRec(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
function isFiniteNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}
function isNullOrNum(v: unknown): v is number | null {
  return v === null || isFiniteNum(v)
}
function isStrArr(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string')
}

/**
 * Validates a raw AI response as a TradeDecision.
 * Returns a typed result, never throws. Invalid responses produce a list of
 * structured errors so the orchestrator can audit and reject.
 */
export function validateTradeDecision(
  raw: unknown,
): ValidationResult<TradeDecision> {
  const errors: ValidationError[] = []
  const push = (path: string, message: string) => errors.push({ path, message })

  if (!isRec(raw)) {
    return { ok: false, errors: [{ path: '$', message: 'not an object' }] }
  }

  const strFields = [
    'id',
    'instrumentId',
    'symbol',
    'thesis',
    'modelSource',
    '_source',
    '_contextHash',
  ] as const
  for (const k of strFields) {
    if (typeof raw[k] !== 'string' || (raw[k] as string).length === 0) {
      push(k, 'missing or empty string')
    }
  }

  if (!isFiniteNum(raw.timestamp) || (raw.timestamp as number) <= 0) {
    push('timestamp', 'must be a positive number')
  }

  if (!ACTIONS.includes(raw.action as DecisionAction)) {
    push('action', `must be one of ${ACTIONS.join('|')}`)
  }
  if (!RISKS.includes(raw.riskLevel as DecisionRisk)) {
    push('riskLevel', `must be one of ${RISKS.join('|')}`)
  }
  if (!HORIZONS.includes(raw.horizon as DecisionHorizon)) {
    push('horizon', `must be one of ${HORIZONS.join('|')}`)
  }

  if (!isFiniteNum(raw.size) || (raw.size as number) < 0) {
    push('size', 'must be a non-negative number')
  }
  if (!isNullOrNum(raw.entryPrice)) push('entryPrice', 'must be number or null')
  if (!isNullOrNum(raw.stopLoss)) push('stopLoss', 'must be number or null')
  if (!isNullOrNum(raw.takeProfit)) push('takeProfit', 'must be number or null')

  const c = raw.confidence
  if (!isFiniteNum(c) || c < 0 || c > 1) {
    push('confidence', 'must be a number in [0,1]')
  }

  if (!isStrArr(raw.keyFactors)) push('keyFactors', 'must be string[]')
  if (!isStrArr(raw.invalidators)) push('invalidators', 'must be string[]')

  if (typeof raw.requiresHumanReview !== 'boolean') {
    push('requiresHumanReview', 'must be boolean')
  }

  if (raw.consensusScore !== null && !isFiniteNum(raw.consensusScore)) {
    push('consensusScore', 'must be number or null')
  }

  const statusOk =
    typeof raw._status === 'string' &&
    ['LIVE', 'DELAYED', 'SIMULATED', 'STALE', 'UNAVAILABLE', 'ERROR'].includes(
      raw._status,
    )
  if (!statusOk) push('_status', 'invalid DataStatus')

  // Logical coherence: BUY/SELL require size > 0; HOLD must have size 0.
  if (raw.action === 'HOLD' && isFiniteNum(raw.size) && raw.size !== 0) {
    push('size', 'must be 0 when action=HOLD')
  }
  if (
    (raw.action === 'BUY' || raw.action === 'SELL') &&
    isFiniteNum(raw.size) &&
    raw.size <= 0
  ) {
    push('size', 'must be > 0 when action=BUY|SELL')
  }

  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, value: raw as unknown as TradeDecision }
}
